import { logger } from 'log-instance/index.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { useAudioStore } from './stores/audio.mjs';
import {
  DBG,
  DBG_AUDIO, DBG_IDB_AUDIO
} from './defines.mjs'

const HEADERS_MPEG = { ["Accept"]: "audio/mpeg", };
const URL_NO_AUDIO = "https://www.sc-voice.net/audio/no_audio.mp3";

const dbg = DBG_IDB_AUDIO;

export default class IdbAudio {
  constructor(opts={}) {
    const msg = "IdbAudio.ctor()";
    if (typeof(opts) === 'string') {
      opts = { src: opts };
    }
    let {
      src=URL_NO_AUDIO,
      audioContext,
      preload=false,
      created=Date.now(),
    } = opts;
    if (audioContext == null) {
      // Safari-specific fix: use default AudioContext without forcing sample rate
      audioContext = new AudioContext();
      dbg && console.log(msg, '[1]new AudioContext', audioContext.state, 
        'sampleRate:', audioContext.sampleRate);
      audioContext.onstatechange = val=>{
        dbg && console.log(msg, '[2]onstatechange', 
          audioContext.state, val);
      }
      let promise = audioContext.resume(); // for iOS
      dbg && promise.then(val=>{
        console.log(msg, '[3]resume', audioContext.state, val);
      });
    }
    Object.assign(this, {
      audioBuffer: null,
      audioContext,
      audioSource: null,
      audio: useAudioStore(),
      created,
      ended: ()=>{ console.log(msg, "[3]ended()"); },
      msPlay: 0,
      msStart: null,
      preload,
    });
    this.src = src;
  }

  static get URL_NO_AUDIO() { return URL_NO_AUDIO; }

  get src() {
    return this.currentSrc;
  }

  set src(value) {
    const msg = `IdbAudio.src.set()`;
    const dbg = DBG_AUDIO;
    const dbgv = DBG.VERBOSE && dbg;

    let { preload } = this;

    if (this.currentSrc !== value) {
      this.currentSrc = value;
      this.clear();
      if (preload) {
        let promise = this.fetchAudioBuffer();
        promise.then(()=>{
          dbg && console.log(msg, '[1] ok <=', value)
        }).catch(e=>{
          let emsg = `${msg} ${value} ${e.message}`;
          console.warn(emsg);
        });
      }
    }
    return this;
  }

  get duration() {
    let { audioBuffer } = this;
    return audioBuffer?.duration || 0;
  }

  get currentTime() {
    let { msStart, msPlay } = this;
    if (msStart == null) {
      return msPlay;
    }

    let msElapsed = Date.now() - msStart;
    return msPlay + msElapsed;
  }

  set currentTime(value) {
    const msg = 'IdbAudio.set.currentTime()';
    const dbg = DBG_AUDIO;
    const dbgv = DBG.VERBOSE && dbg;
    if (value !== 0) {
      let msg = `IdbAudio.currentTime(${value}) expected zero`;
      logger.warn(msg);
      dbgv && console.trace(msg);
      throw new Error(msg);
    }
    this.msPlay = 0;
  }

  get paused() {
    let { audioContext, audioSource } = this;
    return audioContext.state === 'suspended';
  }

  get isPlaying() {
    let { audioContext, audioBuffer } = this;
    return audioContext?.state === 'running' &&
      audioBuffer != null;
  }

  clear() {
    this.audioSource?.disconnect && this.audioSource.disconnect();
    this.audioSource?.stop && this.audioSource.stop();
    this.audioSource = null;
    this.audioBuffer = null;
    this.msStart = null;
    this.msPlay = 0;
  }

  pause() {
    const msg = 'IdbAudio.pause()';
    const dbg = DBG_IDB_AUDIO;
    let { audioContext, msStart, msPlay } = this;
    switch(audioContext.state) {
      case 'running':
        audioContext.suspend();
        dbg && console.log(msg, '[1]suspend', audioContext.state);
        if (msStart != null) { // playing
          msPlay += Date.now() - msStart;
          dbg && console.log(msg, '[2]playing');
          this.msPlay = msPlay;
        } else {
          dbg && console.log(msg, '[3]!playing');
        }
        break;
      case 'suspended':
      case 'closed':
      default:
        // no action required
        break;
    }
    this.msStart = null;
  }

  async fetchAudioBuffer() {
    const msgPfx = 'IdbAudio.fetchAudioBuffer()';
    const dbg = DBG_AUDIO;
    const dbgv = DBG.VERBOSE && dbg;
    try {
      let { audioContext, audio, src } = this;

      // temporarily use fetch time as playing time
      this.msStart = Date.now(); 

      let arrayBuffer = await audio.fetchArrayBuffer(src);
      this.arrayBuffer = arrayBuffer;
      let audioBuffer = await audio.createAudioBuffer({
        audioContext, arrayBuffer});
      this.audioBuffer = audioBuffer;
      return audioBuffer;
    } catch(e) {
      let msg = `${msgPfx} ERROR ${e.message}`;
      logger.warn(msg);
      dbgv && console.trace(msg,e);
    }
  }

  async play() {
    const msg = 'IdbAudio.play()';
    const dbg = DBG_AUDIO || DBG_IDB_AUDIO;
    const dbgv = DBG.VERBOSE && dbg;
    try {
      let { audioContext, src, msStart, audio } = this;

      switch (audioContext.state) {
        case 'suspended':
          dbg && console.log(msg, '[1]resume');
          audioContext.resume();
          this.msStart = Date.now(); // activate currentTime
          return;
        case 'running': {
          if (this.audioBuffer == null) {
            dbg && console.log(msg, '[2]fetchAudioBuffer');
            this.audioBuffer = this.fetchAudioBuffer();
          }
          if (this.audioBuffer instanceof Promise) {
            this.audioBuffer = await this.audioBuffer;
            dbg && console.log(msg, '[3]fetchAudioBuffer=>', 
              this.audioBuffer);
          }
          let audioBuffer = this.audioBuffer;
          if (msStart == null) { // paused
            this.msStart = Date.now(); // actual playing time
          }
          let audioSource = await audio.createAudioSource({
            audioContext, audioBuffer});
          this.audioSource = audioSource;
          /* void */ await audio.playAudioSource({
            audioContext, audioSource});
          dbg && console.log(msg, '[4]playAudioSource', 
            audioContext.state);
          this.audioSource = null;
          this.audioBuffer = null;
          break;
        }
        case 'closed': {
          let fullmsg = `${msg} [5]ERROR audioContext is closed`;
          console.warn(fullmsg);
          dbgv && console.trace(fullmsg);
          throw new DOMException(fullmsg, INVALID_STATE_ERROR);
        }
        default: {
          let fullmsg = `${msg} [6]ERROR unknown state:${audioContext.state}`;
          console.warn(fullmsg);
          dbgv && console.trace(fullmsg);
          throw new DOMException(fullmsg, INVALID_STATE_ERROR);
        }
      }
    } catch (e) {
      let fullmsg = `${msg} [7]ERROR ${e.message}`;
      console.warn(fullmsg);
      dbgv && console.trace(fullmsg);
      return null;
    }

    return this.arrayBuffer;
  }

  static get URL_NO_AUDIO() {
    return URL_NO_AUDIO;
  }
}


