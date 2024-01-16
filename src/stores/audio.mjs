import { defineStore } from 'pinia';
import { logger } from 'log-instance/index.mjs';
import { SuttaRef, AuthorsV2 } from 'scv-esm/main.mjs';
import { useSettingsStore } from './settings.mjs';
import { useVolatileStore } from './volatile.mjs';
import { default as EbtSettings } from '../ebt-settings.mjs';
import { default as IdbAudio } from '../idb-audio.mjs';
import * as VOICES from "../auto/voices.mjs";
import { ref, nextTick } from 'vue';
import * as Idb from 'idb-keyval';
import { 
  DBG_KEY, DBG_AUDIO, DBG_VERBOSE, DBG_HIGHLIGHT_EG,
  DBG_LOG_HTML,
} from '../defines.mjs';

const URL_NOAUDIO = "audio/383542__alixgaus__turn-page.mp3"; 
const HEADERS_JSON = { ["Accept"]: "application/json", };
const HEADERS_MPEG = { ["Accept"]: "audio/mpeg", };
const SAMPLE_RATE = 48000;
const V = ' ';
var segAudioDb;
var soundDb;

function SEG_AUDIO_STORE() {
  if (segAudioDb === undefined) {
    segAudioDb = Idb.createStore('seg-audio-db', 'seg-audio-store')
  }
  return segAudioDb;
}

function SOUND_STORE() {
  if (soundDb === undefined) {
    soundDb = Idb.createStore('sound-db', 'sound-store')
  }
  return soundDb;
}

function deleteDatabase(name) {
  const msg = 'audio.deleteDatabase()';
  const dbg = DBG_AUDIO;

  dbg && console.log(msg, '[1]', name);
  const DBDeleteRequest = window.indexedDB.deleteDatabase(name);

  DBDeleteRequest.onerror = (event) => {
    console.warn(msg, `[2]Error deleting database`, {name,event});
  };

  DBDeleteRequest.onsuccess = (event) => {
    dbg && console.log(msg, '[3]ok', {name,event}); 
    // event.result should be undefined
  };

  return DBDeleteRequest;
}

const PLAY_ONE = 'one';
const PLAY_END = 'end';
const clickElt = ref(undefined);
const audioIndex = ref(0);
const audioSutta = ref(null);
const audioScid = ref('');
const audioFocused = ref(false);
const mainContext = ref(null);
const segmentPlaying = ref(false);
const audioElapsed = ref(0);
const idbAudio = ref(undefined);
const playMode = ref(PLAY_ONE);

export const useAudioStore = defineStore('audio', {
  state: () => {
    return {
      nFetch: 0,
      nGet: 0,
      nSet: 0,
      audioIndex,
      audioSutta,
      audioScid,
      audioFocused,
      mainContext,
      segmentPlaying,
      audioElapsed,
      idbAudio,
      playMode,
      clickElt,
    }
  },
  getters: {
  },
  actions: {
    keydown(evt) {
      const msg = `audio.keydown(${evt.code}) `;
      const dbg = DBG_KEY || DBG_AUDIO;
      switch (evt.code) {
        case 'ArrowUp':
          if (evt.ctrlKey) {
            dbg && console.log(msg, '[1]setLocation');
            this.setLocation(0);
          } else if (evt.shiftKey) {
            dbg && console.log(msg, '[2]incrementGroup(-1)');
            this.incrementGroup(-1);
          } else {
            dbg && console.log(msg, '[3]back');
            this.back();
          }
          break;
        case 'ArrowDown':
          if (evt.ctrlKey) {
            dbg && console.log(msg, '[4]setLocation');
            this.setLocation(-1);
          } else if (evt.shiftKey) {
            dbg && console.log(msg, '[5]incrementGroup(1)');
            this.incrementGroup(1);
          } else {
            dbg && console.log(msg, '[6]next');
            this.next();
          }
          break;
        case 'Space':
          if (!evt.altKey && !evt.metaKey) {
            if (evt.shiftKey || evt.ctrlKey) {
              dbg && console.log(msg, '[7]clickPlayToEnd');
              this.clickPlayToEnd();
            } else {
              dbg && console.log(msg, '[8]clickPlayOne');
              this.clickPlayOne();
            }
          }
          break;
        case 'Enter':
          dbg && console.log(msg, '[9]clickPlayToEnd');
          this.clickPlayToEnd();
          break;
        default: 
          // Defer to App.vue keydown listener
          return;
      }
      evt.preventDefault();
      evt.stopPropagation();
    },
    playPause(playMode) {
      let { idbAudio, mainContext, } = this;
      this.playClick();

      if (idbAudio?.audioSource) {
        if (!idbAudio.paused) {
          idbAudio.pause();
          return true;
        }
        if (playMode === this.playMode) {
          idbAudio.play();
          return true;
        } 
        return false;
      }

      mainContext && mainContext.close();
      //this.createIdbAudio();
      this.playMode = playMode;
      return false;
    },
    registerClickElt(elt) {
      const msg = 'audio.registerClickElt()';
      const dbg = DBG_AUDIO;
      const dbgv = dbg && DBG_VERBOSE && !DBG_LOG_HTML;
      if (clickElt.value === elt) { // no change
        dbgv && console.log(V+msg, '[1]n/a');
        return elt;
      }
      if (elt == null) {
        console.warn(msg, '[2]elt?');
        return elt;
      }

      dbg && console.log(msg, '[3]', {elt});
      clickElt.value = elt;

      let settings = useSettingsStore();
      let { audioVolume } = settings;
      dbg && console.log(msg, '[4]volume', audioVolume);
      elt.volume = audioVolume;

      return elt;
    },
    async playOne() {
      const msg = 'audio.playOne() ';
      logger.info(msg +'PLAY', this.audioScid);
      let completed = await this.playSegment();
      if (!completed) {
        // interrupted
      } else if (await this.next()) {
        logger.debug(msg+'OK');
      } else {
        logger.debug(msg+'END');
        this.playBell();
      }
    },
    clickPlayOne() {
      let msg = 'audio.clickPlayOne() ';
      let settings = useSettingsStore();
      settings.tutorPlay = false;

      if (this.playPause(PLAY_ONE)) {
        logger.info(msg + 'toggled');
        return;
      }

      logger.info(msg + 'playing');
      this.createIdbAudio();
      this.playOne();
    },
    async playToEnd() {
      const msg = 'audio.playToEnd() ';
      let settings = useSettingsStore();
      settings.tutorPlay = false;

      logger.info(msg+'PLAY', this.audioScid);
      let segPlayed;
      do {
        segPlayed = await this.playSegment();
      } while(segPlayed && (await this.next()));
      if (segPlayed) {
        logger.info(msg+'END');
        await this.playBell();
      }
    },
    clickPlayToEnd() {
      const msg = 'audio.clickPlayToEnd() ';
      if (this.playPause(PLAY_END)) {
        logger.debug(msg + 'toggled');
        return;
      }

      logger.info(msg + 'playing');
      this.createIdbAudio();
      this.playToEnd();
    },
    back() {
      return this.incrementSegment(-1);
    },
    next() {
      return this.incrementSegment(1);
    },
    setLocation(delta=0) {
      const msg = `audio.setLocation(${delta}) `;
      let volatile = useVolatileStore();
      let { routeCard } = volatile;
      let { audioSutta, } = this;
      let { segments } = audioSutta;
      let incRes = routeCard.setLocation({ segments, delta, });
      if (incRes) {
        let { iSegment } = incRes;
        this.audioScid = segments[iSegment].scid;
        volatile.setRoute(routeCard.routeHash(), true, msg);
        this.playSwoosh();
        logger.debug(msg, incRes);
      } else {
        this.playBell();
        logger.debug(msg+'END');
      }

      return incRes;
    },
    incrementGroup(delta=1) {
      const msg = `audio.incrementGroup(${delta}) `;
      const dbg = DBG_AUDIO;
      let volatile = useVolatileStore();
      let { routeCard } = volatile;
      let { audioSutta, } = this;
      let { segments } = audioSutta;
      let incRes = routeCard.incrementGroup({segments, delta});
      if (incRes) {
        let { iSegment } = incRes;
        this.audioScid = segments[iSegment].scid;
        volatile.setRoute(routeCard.routeHash(), true, msg);
        this.playSwoosh();
        dbg && console.log(msg, '[1]incRes', incRes);
      } else {
        this.playBell();
        dbg && console.log(msg, '[2]END');
      }

      return incRes;
    },
    async playSegment() {
      const msg = `audio.playSegment() `;
      let settings = useSettingsStore();
      let audio = this;
      let { idbAudio, audioScid } = audio;
      let segAudio = await audio.bindSegmentAudio();
      let { segment:seg, langTrans } = segAudio;

      logger.debug(`${msg} ${audioScid}`);

      let interval;
      try {
        audio.audioElapsed = -2;
        interval = setInterval( ()=>{
          let currentTime = audio.idbAudio?.currentTime || -1;
          audio.audioElapsed = currentTime/1000;
          if (audio.audioScid !== audioScid) {
            clearInterval(interval);
            logger.debug(msg + `interrupt`, 
              interval,
              `${audioScid}=>${audio.audioScid}`);
            audio.segmentPlaying = false;
            idbAudio.clear();
          }
        }, 100);
        logger.debug(msg + 'setInterval', interval);
        audio.segmentPlaying = true;

        if (audio.segmentPlaying && settings.speakPali && seg.pli) {
          let src = await audio.pliAudioUrl;
          idbAudio.src = src;
          logger.debug(`${msg} pliUrl:`, src);
          await idbAudio.play();
        }

        let speakTrans = settings.speakTranslation && 
          settings.showTrans && seg[langTrans];
        if (audio.segmentPlaying && speakTrans) {
          let src = await audio.transAudioUrl;
          idbAudio.src = src;
          logger.debug(`${msg} transUrl:`, src);
          await idbAudio.play();
        }
        logger.debug(msg + 'clearInterval', interval);
        clearInterval(interval);
        interval = undefined;
      } catch(e) {
        clearInterval(interval);
        interval = undefined;
        logger.warn(msg, e);
      } finally {
        audio.audioElapsed = -1;
      }

      logger.debug(`${msg} segmentPlaying`, audio.segmentPlaying);

      if (!audio.segmentPlaying) {
        return false; // interrupted
      }

      audio.segmentPlaying = false;
      return true; // completed
    },
    audioDuration() {
      let duration = this.idbAudio?.audioBuffer?.duration;
      return duration;
    },
    createIdbAudio() {
      const msg = "audio.createIdbAudio() ";
      const dbg = DBG_AUDIO;
      //console.trace(msg);
      // NOTE: Caller must be UI callback (iOS restriction)
      let audioContext = this.mainContext = this.getAudioContext();
      dbg && console.log(msg, '[1]new IdbAudio');
      let idbAudio = this.idbAudio = new IdbAudio({audioContext});
      return idbAudio;
    },
    async incrementSegment(delta) {
      const msg = `audio.incrementSegment(${delta}) `;
      const dbg = DBG_AUDIO;
      let volatile = useVolatileStore();
      let { routeCard } = volatile;
      let { audioSutta, } = this;
      let { segments } = audioSutta;
      let incRes = routeCard.incrementLocation({ segments, delta, });
      if (incRes) {
        let { iSegment } = incRes;
        let seg = segments[iSegment];
        this.audioScid = seg.scid;
        let hash = routeCard.routeHash();
        volatile.setRoute(hash, true, msg);
        this.playClick();
        dbg && console.log(msg, '[1]incRes', incRes);
      } else {
        this.playBell();
        dbg && console.log(msg, '[2]END');
      }
      await new Promise(resolve=>nextTick(()=>resolve())); // sync instance

      return incRes;
    },
    async clearSoundCache() {
      const msg = 'audio.clearSoundCache() ';
      try {
        logger.warn(msg);
        const reqSoundDb = deleteDatabase("sound-db");
        const reqSegAudioDb = deleteDatabase("seg-audio-db");
        segAudioDb = null;
        soundDb = null;
        console.log(msg, {reqSoundDb, reqSegAudioDb});
        nextTick(()=>window.location.reload()); } catch(e) {
        logger.warn(msg + 'ERROR', e.message);
        throw e;
      }
    },
    playSwoosh(audioContext) {
      const msg = 'audio.playSwoosh() ';
      const dbg = DBG_AUDIO;
      let settings = useSettingsStore();
      let volume = settings.swooshVolume;
      let url =  volume ? `audio/swoosh${volume}.mp3` : null;
      dbg && console.log(msg, '[1]playUrl', url);
      return this.playUrl(url, {audioContext});
    },
    playBlock(audioContext) {
      const msg = 'audio.playBlock() ';
      const dbg = DBG_AUDIO;
      let settings = useSettingsStore();
      let volume = settings.blockVolume;
      let url =  volume ? `audio/block${volume}.mp3` : null;
      dbg && console.log(msg, '[1]playURl', url);
      return this.playUrl(url, {audioContext});
    },
    playClick() {
      const msg = 'audio.playClick() ';
      const dbg = DBG_AUDIO;
      let { clickElt } = this;
      if (clickElt) {
        dbg && console.log(msg, '[1]play', clickElt?.id);
        /* await */ clickElt.play();
      } else {
        dbg && console.warn(msg, '[1]clickElt?');
      }
    },
    playBell(audioContext) {
      const msg = 'audio.playBell() ';
      const dbg = DBG_AUDIO;
      let settings = useSettingsStore();
      let { ips } = settings;
      let ipsChoice = EbtSettings.IPS_CHOICES.filter(c=>c.value===ips)[0];
      let url = ipsChoice?.url?.substring(1);
      dbg && console.log(msg, '[1]', url);
      return this.playUrl(url, {audioContext});
    },
    async setAudioSutta(audioSutta, audioIndex=0) {
      const msg = 'audio.setAudioSutta() '
      const dbg = DBG_AUDIO;
      dbg && console.log(msg, `[1]${this.audioSutta} <=`, audioSutta);
      this.audioSutta = audioSutta;
      this.audioIndex = audioIndex;

      let segments = audioSutta?.segments;
      let audioScid = segments
        ? segments[audioIndex].scid
        : null;
      this.audioScid = audioScid;
      if (audioScid) {
        this.updateAudioExamples();
      }
    },
    updateAudioExamples() {
      const msg = "audio.updateAudioExamples()";
      const dbg = DBG_HIGHLIGHT_EG;
      let { audioSutta, audioIndex } = this;
      let segments = audioSutta?.segments;
      if (segments) {
        let segment = segments[audioIndex];
        dbg && console.log('msg', '[1]highlightEamples', segment.scid);
        let updated = audioSutta.highlightExamples({segment});
        if (updated) {
          segment.examples = updated;
        }
      } else {
        dbg && console.log('msg', '[2]F highlightEamples');
      }
    },
    getAudioContext() {
      const msg = "audio.getAudioContext() "
      const dbg = DBG_AUDIO;
      // IMPORTANT! Call this from a user-initiated non-async context
      dbg && console.log(msg, '[1]new AudioContext()');
      let audioContext = new AudioContext();
      audioContext.resume(); // required for iOS
      return audioContext;
    },
    transVoiceName(suttaRef, settings=useSettingsStore()) {
      let vTrans = settings.vnameTrans;
      let { lang, } = suttaRef;
      if (lang !== settings.langTrans) {
        let langVoice = VOICES.default.filter(v=>v.langTrans===lang)[0];
        vTrans = langVoice.name || vTrans;
      }
      return vTrans;
    },
    segAudioKey(idOrRef, settings=useSettingsStore()) {
      const msg = "audio.segAudioKey() ";
      let { langTrans, vnameRoot } = settings;
      let suttaRef = SuttaRef.create(idOrRef, langTrans);
      let { lang, author, scid } = suttaRef;
      author = author || AuthorsV2.langAuthor(lang);
      if (author == null) {
        let emsg = `${msg} author is required: ` +
          JSON.stringify(idOrRef);
        throw new Error(emsg);
      }
      let vTrans = this.transVoiceName(suttaRef, settings);
      let key = `${scid}/${lang}/${author}/${vTrans}/${vnameRoot}`;
      //console.log(msg, {key, idOrRef});
      return key;
    },
    async fetchSegmentAudio(idOrRef, settings=useSettingsStore()) {
      const msg = "audio.fetchSegmentAudio()";
      const dbg = DBG_AUDIO;
      const volatile = useVolatileStore();
      let segAudio;
      try {
        volatile.waitBegin("ebt.loadingAudio");
        let audioUrl = this.segmentAudioUrl(idOrRef, settings);
        this.nFetch++;
        dbg && console.log(msg, '[1]fetch', audioUrl);
        let resAudio = await fetch(audioUrl, { headers: HEADERS_JSON });
        segAudio = await resAudio.json();
      } catch(e) {
        volatile.alert(e);
        throw e;
      } finally {
        volatile.waitEnd();
      }
      return segAudio;
    },
    async getSegmentAudio(idOrRef, settings=useSettingsStore()) {
      const msg = 'audio.getSegmentAudio() ';
      const dbg = DBG_AUDIO;
      let segAudioKey = this.segAudioKey(idOrRef, settings);
      let segAudio = await Idb.get(segAudioKey, SEG_AUDIO_STORE());
      if (segAudio) {
        let age = ((Date.now()-segAudio.created)/1000).toFixed(1);
        dbg && console.log(msg, "[1]segAudio", segAudioKey, {age});
      } else {
        dbg && console.log(msg, "[2]fetchSegmentAudio", idOrRef);
        segAudio = await this.fetchSegmentAudio(idOrRef, settings);
        segAudio.created = Date.now();
        dbg && console.log(msg, '[3]Idb.set', segAudioKey);
        await Idb.set(segAudioKey, segAudio, SEG_AUDIO_STORE());
      }
      return segAudio;
    },
    segmentAudioUrl(idOrRef, settings=useSettingsStore()) {
      const msg = 'audio.segmentAudioUrl()';
      const dbg = DBG_AUDIO;
      let { langTrans, serverUrl, vnameRoot } = settings;
      let suttaRef = SuttaRef.create(idOrRef, langTrans);
      let { sutta_uid, lang, author, scid } = suttaRef;
      author = author || AuthorsV2.langAuthor(lang);
      let vTrans = this.transVoiceName(suttaRef, settings);
      if (author == null) {
        let emsg = `${msg} author is required ${JSON.stringify(idOrRef)}`;
        console.warn(emsg);
        throw new Error(emsg);
      }
      let url =  [ 
        serverUrl, 
        'play', 
        'segment',
        sutta_uid,
        lang,
        author,
        scid,
        vTrans,
        vnameRoot,
      ].join('/'); 
      dbg && console.log(msg, url);
      return url;
    },
    playUrl(url, opts={}) {
      const msg = "audio.playUrl() ";
      const dbg = DBG_AUDIO;
      let { audioContext } = opts;
      let tempContext = audioContext == null 
        ? this.getAudioContext() : null;
      audioContext = audioContext || tempContext;

      dbg && console.log(msg, '[1]playUrlAsync', url);
      let promise = this.playUrlAsync(url, {audioContext});

      tempContext && promise.then(()=>{
        tempContext.close();
      });

      return promise;
    },
    async playUrlAsync(url, opts) {
      const msg = 'audio.playUrlAsync() ';
      const dbg = DBG_AUDIO;
      const dbgv = DBG_VERBOSE && dbg;
      if (url == null) {
        return null;
      }

      let { audioContext } = opts;
      if (audioContext == null) {
        throw new Error(`${msg} audioContext is required`);
      }

      dbg && console.log(msg, '[1]fetchArrayBuffer', url);
      let arrayBuffer = await this.fetchArrayBuffer(url, opts);
      let { byteLength } = arrayBuffer;
      dbgv && console.log(V+msg, `[2]playArrayBuffer[${byteLength}]`);
      return this.playArrayBuffer({arrayBuffer, audioContext, });
    },
    async fetchArrayBuffer(url, opts={}) {
      const msg = `audio.fetchArrayBuffer()`;
      const dbg = DBG_AUDIO;
      const dbgv = DBG_VERBOSE && dbg;
      const volatile = useVolatileStore();
      let { headers=HEADERS_MPEG } = opts;
      try {
        let urlParts = url.split('/');
        let iKey = Math.max(0, urlParts.length-4);
        let idbSegKey = urlParts.slice(iKey).join('/');
        let abuf = await Idb.get(idbSegKey, SOUND_STORE());
        if (abuf) {
          dbgv && console.log(V+msg, '[1]cached');
        } else {
          this.nFetch++;
          dbgv && console.log(V+msg, '[2]fetch', url);
          let res = await fetch(url, { headers });
          switch (res.status) {
            case 200:
              dbg && console.log(V+msg, `[3]fetch ok`);
              break;
            default:
              dbg && console.log(msg, `[4]fetch => HTTP${res.status}`);
              break;
          }
          abuf = await res.arrayBuffer();
          dbg && console.log(msg, `[4]Idb.set`, idbSegKey, 
            abuf.byteLength);
          await Idb.set(idbSegKey, abuf, SOUND_STORE());
        }
        return abuf;
      } catch(e) {
        let eNew = new Error(`${msg} => ${e.message}`);
        volatile.alert(eNew.message, 'ebt.audioError');
        throw eNew;
      }
    },
    async langAudioUrl(opts={}) {
      const msg = 'audio.langAudioUrl() ';
      const dbg = DBG_AUDIO;
      let {idOrRef, lang, settings=useSettingsStore(), segAudio} = opts;
      let { serverUrl, langTrans } = settings;
      if (typeof lang !== 'string') {
        if (lang) {
          throw new Error(msg + `lang is required: ${lang}`);
        }
        lang = settings.langTrans;
      }
      lang = lang.toLowerCase();
      let segRef = EbtSettings.segmentRef(idOrRef, settings);
      //console.log(msg, {idOrRef, segRef});
      segAudio = segAudio || await this.getSegmentAudio(segRef, settings);
      dbg && console.log(msg, '[1]segAudio', segAudio);
      let { 
        sutta_uid, translator, segment, vnameRoot, vnameTrans 
      } = segAudio;
      let { audio } = segment;
      let guid = audio[lang];
      let text = segment[lang];
      let url = null;
      if (text) {
        url = [
          serverUrl,
          'audio',
          sutta_uid,
          lang,
          lang === 'pli' ? 'ms' : translator,
          lang === langTrans ? vnameTrans : vnameRoot,
          guid,
        ].join('/');
      }
      return url;
    },
    async createAudioBuffer({audioContext, arrayBuffer}) {
      const dbg = DBG_AUDIO;
      const dbgv = DBG_VERBOSE && dbg;
      const msgPrefix = 'audio.createAudioBuffer()';
      const volatile = useVolatileStore();
      try {
        if (arrayBuffer.byteLength < 500) {
          let msg = `${msgPrefix} invalid arrayBuffer`;
          volatile.alert(msg, 'ebt.audioError');
          throw new Error(msg);
        }
        let audioData = await new Promise((resolve, reject)=>{
          audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
        let numberOfChannels = Math.min(2, audioData.numberOfChannels);
        let length = audioData.length;
        let sampleRate = Math.max(SAMPLE_RATE, audioData.sampleRate);
        logger.debug(`${msgPrefix}`, {
          sampleRate, length, numberOfChannels});
        let audioBuffer = audioContext.createBuffer(
          numberOfChannels, length, sampleRate);
        for (let iChan = 0; iChan < numberOfChannels; iChan++) {
          let rawData = new Float32Array(length);
          rawData.set(audioData.getChannelData(iChan), 0);
          audioBuffer.getChannelData(iChan).set(rawData);
        }

        return audioBuffer;
      } catch(e) {
        let msg = `${msgPrefix} ERROR`;
        logger.warn(msg);
        dbgv && console.trace(msg, e);
        throw e;
      }
    },
    async createAudioSource({audioContext, audioBuffer}) {
      const msg = 'IdbAudio.createAudioSource()';
      const dbg = DBG_AUDIO;
      dbg && console.log(msg, '[1]createBufferSource');
      let audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioContext.destination);
      return audioSource;
    },
    async playAudioSource({audioSource}) {
      const msg = 'IdbAudio.playAudioSource()';
      const dbg = DBG_AUDIO;
      const volatile = useVolatileStore();
      return new Promise((resolve, reject) => { try {
        audioSource.onended = evt => {
          dbg && console.log(msg, '[1]ok', {evt});
          resolve();
        };
        audioSource.start();
      } catch(e) {
        volatile.alert(e, 'ebt.audioError');
        reject(e);
      }}); // Promise
    },
    async playArrayBuffer({arrayBuffer, audioContext, }) {
      const msg = 'audio.playArrayBuffer()';
      const dbg = DBG_AUDIO;
      const volatile = useVolatileStore();
      try {
        let audioBuffer = await this.createAudioBuffer(
          {audioContext, arrayBuffer});
        let audioSource = await this.createAudioSource(
          {audioBuffer, audioContext});
        dbg && console.log(msg, '[1]playAudioSource',
          `${arrayBuffer.byteLength}B`);
        return this.playAudioSource({audioContext, audioSource});
      } catch(e) {
        volatile.alert(e, 'ebt.audioError');
        throw e;
      }
    },
    async bindSegmentAudio(args={}) {
      const msg = 'sutta.bindSegmentAudio() ';
      const dbg = DBG_AUDIO;
      let { 
        volatile=useVolatileStore(),
        settings=useSettingsStore(),
      } = args;
      let { routeCard } = volatile;
      if (routeCard == null) {
        return null;
      }
      let result;
      let { langTrans, serverUrl } = settings;
      let [ /*scid*/, lang=langTrans, author ] = 
        routeCard?.location || {};
      let srefStr = routeCard.location.join('/');
      let suttaRef = SuttaRef.create(srefStr, langTrans);
      let { sutta_uid, } = suttaRef;
      try {
        volatile.waitBegin('ebt.loadingAudio');

        let segAudio = await this.getSegmentAudio(suttaRef);
        dbg && console.log(V+msg, '[1]segAudio', segAudio);
        let { segment, vnameTrans, vnameRoot } = segAudio;

        if (settings.speakPali) {
          if (segment.pli) {
            this.pliAudioUrl = [
              serverUrl,
              'audio',
              sutta_uid,
              'pli',
              author,
              vnameRoot,
              segment.audio.pli,
            ].join('/');
          } else {
            this.pliAudioUrl = URL_NOAUDIO;
          }
          dbg && console.log(msg, '[2]pliAudioUrl', this.pliAudioUrl);
        }
        if (segment && settings.speakTranslation) {
          let langText = segment[lang];
          if (langText) {
            this.transAudioUrl = [
              serverUrl,
              'audio',
              sutta_uid,
              lang,
              author,
              vnameTrans,
              segment.audio[lang],
            ].join('/');
          } else {
            this.transAudioUrl = URL_NOAUDIO;
          }
          dbg && console.log(msg, '[3]transAudioUrl', this.transAudioUrl);
        }
        result = segAudio;
      } finally {
        volatile.waitEnd();
      }
      return result;
    },
  },
})
