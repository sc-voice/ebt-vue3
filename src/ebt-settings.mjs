import { logger } from 'log-instance/index.mjs';
import { default as EbtCard } from './ebt-card.mjs';
import { default as VOICES } from './auto/voices.mjs';
import { SuttaRef, AuthorsV2 } from 'scv-esm/main.mjs';
import { default as EbtConfig } from "../ebt-config.mjs";
import { DBG, } from './defines.mjs';

const AUDIO = { MP3: 'mp3', OGG: 'ogg', OPUS: 'opus', };

const SERVERS = [{
  title: 'www.api.sc-voice.net',
  value: 'https://www.api.sc-voice.net/scv',
  hint: 'Voice API server (Linode production)',
},{
  title: 'staging.api.sc-voice.net',
  value: 'https://staging.api.sc-voice.net/scv',
  hint: 'Voice API server (Linode pre-production)',
},{
  title: 'localhost:8080 (DEVELOPMENT)',
  value: 'http://localhost:8080/scv',
  hint: 'ScvServer (localhost development)',
  dev: true,
}];

function scLang(lang) {
  let scLang = lang.toLowerCase();
  if (scLang === 'ja') {
    scLang = 'jpn';
  } else {
    scLang = scLang.split('-')[0];
  }

  return scLang;
}

export default class EbtSettings {
  constructor(opts = {}) {
    const msg = 'ebt-settings.ctor() ';
    let {
      alwaysShowLatestText,
      audio,
      blockVolume,
      clickVolume,
      docAuthor, 
      docLang,    // bilara translation document language (e.g., 'jpn')
      fullLine,
      highightExamples,
      ips,
      langTrans,  // UI translation language (e.g., 'ja') 
      locale,     // Web page language
      maxPlayMinutes, 
      maxResults,
      playEnd,
      refAuthor,
      refLang,
      serverUrl,
      showId,
      showPali,
      showReference,
      showSutta,
      showTrans,
      showVinaya,
      speakPali,
      speakTranslation,
      swooshVolume,
      tutorAsk,
      tutorClose,
      tutorPlay,
      tutorSearch,
      tutorSettings,
      tutorWiki,
      vnameRoot,
      vnameTrans,

    } = Object.assign({}, EbtSettings.INITIAL_STATE, opts);
    (opts.logger || logger).logInstance(this, opts);

    this.audio = audio;
    this.clickVolume = clickVolume;
    this.blockVolume = blockVolume;
    this.swooshVolume = swooshVolume;
    this.fullLine = fullLine;
    this.ips = 6;
    this.langTrans = EbtSettings.TRANS_LANGUAGES.reduce((a, l) => {
      return l.code === langTrans ? langTrans : a;
    }, 'en');
    this.docAuthor = docAuthor;
    this.locale = EbtSettings.WEB_LANGUAGES.reduce((a, l) => {
      return l.code === locale ? locale : a;
    }, 'en');
    this.maxResults = maxResults;
    this.maxPlayMinutes = maxPlayMinutes;
    this.playEnd = playEnd;
    this.refLang = refLang;
    this.refAuthor = refAuthor;
    this.docLang = docLang;
    this.serverUrl = serverUrl;
    this.showId = showId;
    this.alwaysShowLatestText = alwaysShowLatestText;
    this.showPali = showPali;
    this.speakPali = speakPali;
    this.speakTranslation = speakTranslation;
    this.showReference = showReference;
    this.showTrans = showTrans;
    this.showSutta = showSutta;
    this.showVinaya = showVinaya;
    //this.tutorAsk = tutorAsk;
    //this.tutorClose = tutorClose;
    //this.tutorPlay = tutorPlay;
    //this.tutorSearch = tutorSearch;
    //this.tutorSettings = tutorSettings;
    this.tutorWiki = tutorWiki;
    this.vnameRoot = vnameRoot;
    this.vnameTrans = vnameTrans;

    EbtSettings.validate(this);
  }

  static get END_REPEAT() { return "⥀"; }
  static get END_STOP() { return "\u23f8"; }
  //static get END_TIPITAKA() { return "🡺"; }
  static get END_PLAYLIST() { return "🡺"; }

  static get SERVERS() {
    return SERVERS;
  }

  static get INITIAL_STATE() {
    const msg = 'EbtSettings.INITIAL_STATE';
    const dbg = 0;
    let NAV_LANG = typeof navigator === 'undefined'
      ? 'en'
      : navigator.languages[0].split('-')[0];
    NAV_LANG = scLang(NAV_LANG);
    dbg && console.log(msg, {navigator, NAV_LANG});
    let REF_LANG = 'en';
    let vnameTrans = VOICES.reduce((a,v)=>{
      return !a && v.langTrans === NAV_LANG ? v.name : a;
    }, undefined) || 'Amy';

    return {
      alwaysShowLatestText: true,
      audio: AUDIO.OGG,
      audioSuffix: 'mp3',
      blockVolume: 2,
      cards: [],
      clickVolume: 2,
      docAuthor: AuthorsV2.langAuthor(NAV_LANG),
      docLang: NAV_LANG,
      fullLine: false,
      highlightExamples: false,
      id: 1,
      ips: 6,
      langRoot: 'pli',
      langs: `pli+${NAV_LANG}`,
      langTrans: NAV_LANG,
      locale: NAV_LANG,
      logLevel: 'warn',
      maxDuration: 3*60*60,
      maxPlayMinutes: EbtConfig.maxPlayMinutes || 30,
      maxResults: 5,
      playEnd: EbtSettings.END_STOP,
      refAuthor: AuthorsV2.langAuthor(REF_LANG),
      refLang: REF_LANG,
      scid: undefined,
      serverUrl: SERVERS[0].value,
      showGdpr: true,
      showId: true,
      showPali: true,
      showReference: false,
      showTrans: true,
      speakPali: true,
      speakTranslation: true,
      sutta_uid: undefined,
      swooshVolume: 2,
      tutorAsk: true,
      tutorClose: true,
      tutorPlay: true,
      tutorSearch: true,
      tutorSettings: true,
      tutorWiki: true,
      theme: 'dark',
      translator: 'sujato',
      vnameRoot: 'Aditi',
      vnameTrans,

    }
  }

  static get REF_LANGUAGES() {
    return [{
      code: 'de',
      label: 'DE / Sabbamitta',
    }, {
      code: 'en',
      label: 'EN / Sujato',
    }];
  }

  static get TRANS_LANGUAGES() {
    return [{
      code: 'cs',
      label: 'CS / Čeština ',
      //}, {
      //code: 'da',
      //label: 'DA / Dansk',
    }, {
      code: 'de',
      label: 'DE / Deutsch',
    }, {
      code: 'en',
      label: 'EN / English',
    }, {
      code: 'es',
      label: 'ES / Español',
    }, {
      code: 'fr',
      label: 'FR / Français',
      //}, {
      //code: 'hi',
      //label: 'HI / हिंदी',
      //}, {
      //code: 'is',
      //label: 'IS / Íslenska',
    }, {
      code: 'it',
      label: 'IT / Italiano',
    }, {
      code: 'ja',
      label: 'JA / 日本語',
      //}, {
      //code: 'nb',
      //label: 'NB / Norsk',
      //}, { //code: 'nl', //label: 'NL / Nederlands',
      //}, {
      //code: 'pl',
      //label: 'PL / Polski',
    }, {
      code: 'pt',
      label: 'PT / Português ',
      //}, {
      //code: 'ro',
      //label: 'RO / Română',
      //}, {
      //code: 'si',
      //label: 'SI / සිංහල',
      //}, {
      //code: 'vi',
      //label: 'VI / Tiếng Việt',
    }, {
      code: 'ru',
      label: 'RU / Русский',
    }];
  }

  static get WEB_LANGUAGES() {
    return [{
      code: 'cs',
      label: 'CS / Čeština',
    }, {
      code: 'da',
      label: 'DA / Dansk',
    }, {
      code: 'de',
      label: 'DE / Deutsch',
    }, {
      code: 'en',
      label: 'EN / English',
    }, {
      code: 'es',
      label: 'ES / Español',
    }, {
      code: 'fr',
      label: 'FR / Français',
    }, {
      code: 'hi',
      label: 'HI / हिंदी',
    }, {
      code: 'is',
      label: 'IS / Íslenska',
    }, {
      code: 'it',
      label: 'IT / Italiano',
    }, {
      code: 'jpn',
      label: 'JPN / 日本語',
    }, {
      code: 'nb',
      label: 'NB / Norsk',
    }, {
      code: 'nl',
      label: 'NL / Nederlands',
    }, {
      code: 'pl',
      label: 'PL / Polski',
    }, {
      code: 'pt',
      label: 'PT / Português',
    }, {
      code: 'ro',
      label: 'RO / Română',
    }, {
      code: 'ru',
      label: 'RU / Русский',
    }, {
      code: 'si',
      label: 'SI / සිංහල',
    }, {
      code: 'vi',
      label: 'VI / Tiếng Việt',
    }];
  }

  static get IPS_CHOICES() {
    return [{
      url: '',
      i18n: 'bellNone',
      value: 0,
    //}, {
      //url: '',
      //i18n: 'bellRainforest',
      //volume: 0.1,
      //value: 1,
      //hide: true,
    }, {
      url: '/audio/indian-bell-flemur-sampling-plus-1.0.mp3',
      i18n: 'bellIndian',
      volume: 0.1,
      value: 2,
    }, {
      url: '/audio/tibetan-singing-bowl-horst-cc0.mp3',
      i18n: "bellTibetan",
      volume: 0.3,
      value: 3,
    }, {
      url: '/audio/jetrye-bell-meditation-cleaned-CC0.mp3',
      i18n: "bellMeditation",
      volume: 0.1,
      value: 4,
      hide: true,
    }, {
      url: '/audio/STE-004-Coemgenu.mp3',
      i18n: "bellMidrange",
      volume: 0.5,
      value: 5,
    }, {
      url: '/audio/simple-bell.mp3',
      i18n: "bellSimple",
      volume: 0.5,
      value: 6,
    }];
  }

  static langLabel(lang) {
    let info = EbtSettings.WEB_LANGUAGES.find(l => l.code === lang) || {
      label: `unknown language:${lang}`
    };
    return info.label;
  }

  static get AUDIO() {
    return AUDIO;
  }

  static segmentRef(idOrRef, settings=EbtSettings.INITIAL_STATE) {
    const msg = "EbtSettings.segmentRef() ";
    let sref = SuttaRef.create(idOrRef, settings.langTrans);
    let { lang } = sref;
    if (!sref.segnum) {
      sref.segnum = '1.0';
      sref = SuttaRef.create(sref, lang);
    }
    if (!sref.author) {
      sref.author = AuthorsV2.langAuthor(lang);
      sref = SuttaRef.create(sref, lang);
    }
    return sref;
  }

  static scLang(lang) { return scLang(lang); }

  static validate(state) {
    const msg = "EbtSettings.validate() ";
    const dbg = DBG.VERBOSE;
    let isValid = true;
    let changed = null;
    let error = null;
    let {
      docAuthor,
      docLang,
      langTrans,
      maxPlayMinutes,
      playEnd,
      refAuthor,
      refLang,
      showPali,
      showReference,
      showSutta,
      showTrans,
      showVinaya,
      speakPali,
      speakTranslation,
      vnameTrans,

    } = state;

    if (!speakPali && !speakTranslation) {
      changed = Object.assign({speakPali:true}, changed);
    }

    if (!showReference && !showTrans && !showPali) {
      changed = Object.assign({showPali:true}, changed);
    }

    if (!refLang) {
      refLang = 'en';
      changed = Object.assign({refLang}, changed);
    }
    if (!refAuthor) {
      refAuthor = AuthorsV2.langAuthor(refLang);
      changed = Object.assign({refAuthor}, changed);
    }
    let refInfo = AuthorsV2.authorInfo(refAuthor, refLang);
    if (refInfo && refInfo.lang !== refLang) {
      refAuthor = AuthorsV2.langAuthor(refLang);
      changed = Object.assign({refAuthor}, changed);
    }

    if (!langTrans) {
      langTrans = 'en';
      changed = Object.assign({langTrans}, changed);
    }

    switch (langTrans) {
      case 'ja':
        docLang = 'jpn';
        break;
      default:
        docLang = langTrans;
    }
    if (docLang !== state.docLang) {
      changed = Object.assign({docLang}, changed);
      docAuthor = AuthorsV2.langAuthor(docLang);
      changed = Object.assign({docAuthor}, changed);
    }
    if (!docAuthor) {
      docAuthor = AuthorsV2.langAuthor(docLang);
      changed = Object.assign({docAuthor}, changed);
    }
    let docInfo = AuthorsV2.authorInfo(docAuthor, docLang);
    if (docInfo && docInfo.lang !== docLang) {
      docLang = docInfo.lang;
      changed = Object.assign({docLang}, changed);
    }

    vnameTrans = vnameTrans.toLowerCase();
    let voiceTrans = VOICES.find(v=>v.name.toLowerCase() === vnameTrans);
    if (voiceTrans.langTrans !== langTrans) {
      voiceTrans = VOICES.find(v=>
        scLang(v.langTrans) === scLang(langTrans));
      dbg && console.log(msg, {voiceTrans, langTrans});
      vnameTrans = voiceTrans.name;
      if (voiceTrans) {
        changed = Object.assign({vnameTrans}, changed);
      } else {
        isValid = false;
        error = new Error([
          msg,
          'No narrator for language:',
          langTrans,
          '. Using en/sujato.',
        ].join(' '));
        changed = Object.assign({voiceTrans:'sujato', langTrans:'en'}, 
          changed);
      }
    }

    if (showVinaya == null) {
      showVinaya = false;
      changed = Object.assign({showVinaya}, changed);
    }
    if (!showVinaya && !showSutta) {
      showSutta = true;
      changed = Object.assign({showSutta}, changed);
    }
    if (maxPlayMinutes <= 0) {
      maxPlayMinutes = 1;
      changed = Object.assign({maxPlayMinutes}, changed);
    }
    switch (playEnd) {
      case EbtSettings.END_STOP:
      case EbtSettings.END_REPEAT:
      //case EbtSettings.END_TIPITAKA: 
      case EbtSettings.END_PLAYLIST: 
        break; // OK
      default:
        playEnd = EbtSettings.END_STOP;
        changed = Object.assign({playEnd}, changed);
        break;
    }

    //------- END VALIDATION ------------
    if (changed) {
      Object.assign(state, changed);
    }
    return {
      isValid,
      changed,
      error,
    }
  }

  static trilingualPattern(settings, search, trilingual) {
    const msg = 'ebt-settings.trilingualPattern()';
    let { refAuthor, refLang, docAuthor, docLang, } = settings;
    let pattern = search && search.toLowerCase().trim();
    if (trilingual) {
      if (!/-dl\b/.test(pattern)) {
        pattern += ` -dl ${docLang}`;
      }
      if (!/-da\b/.test(pattern)) {
        pattern += ` -da ${docAuthor}`;
      }
      if (!/-rl\b/.test(pattern)) {
        pattern += ` -rl ${refLang}`;
      }
      if (!/-ra\b/.test(pattern)) {
        pattern += ` -ra ${refAuthor}`;
      }
      pattern += ` -ml1`;
    }
    return pattern;
  }

}
