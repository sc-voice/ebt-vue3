
import { logger } from 'log-instance/index.mjs';
import { useSettingsStore } from './stores/settings.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { useAudioStore } from './stores/audio.mjs';
import { ref } from 'vue';
import { default as EbtCard } from './ebt-card.mjs';
import { Tipitaka, AuthorsV2, SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from './defines.mjs'

const tipitaka = new Tipitaka();

export default class Playlist {
  constructor(opts={}) {
    const msg = "playlist.ctor()";
    let settings = useSettingsStore();

    let {
      docLang = settings?.docLang,
      docAuthor = settings?.docAuthor,
      index = 0,
      pattern,
      suttaRefs = [],
    } = opts;

    suttaRefs = suttaRefs.map(sr=>{
      let suttaRef = SuttaRef.create(sr, docLang);
      suttaRef.author = suttaRef.author || 
        AuthorsV2.langAuthor(suttaRef.lang);
      return suttaRef;
    });

    Object.assign(this, {
      docAuthor,
      docLang,
      pattern,
      suttaRefs,
    });

    Object.defineProperty(this, "_index", {
      value: ref(index),
    });
  }

  static get tipitaka() {
    return tipitaka;
  }

  get index() {
    return this._index.value;
  }

  set index(value) {
    this._index.value = 0;
    return this.advance(value);
  }

  get page() {
    return this.index+1;
  }

  set page(value) {
    return this.index = value-1;
  }

  get cursor() {
    let { index, suttaRefs } = this;
    let sr = suttaRefs[index];
    return sr;
  }

  set cursor(value={}) {
    const msg = "Playlsit.set_cursor()";
    const dbg = DBG.PLAYLIST;
    let { suttaRefs, docLang } = this;
    let srv = SuttaRef.create(value, docLang);
    let exists = srv && suttaRefs.reduce((a,sr,i) => {
      if (sr.sutta_uid !== srv.sutta_uid) {
        return a;
      }
      if (srv.author && sr.author!==srv.author) {
        dbg && console.log(msg, '[2]!author', srv.author, sr.author);
        return a;
      }
      sr.segnum = srv.segnum;
      sr.scid = srv.scid;
      sr.author = sr.author || srv.author;
      this._index.value = i;
      return true;
    }, false);
    if (!exists) {
      let emsg = `${msg}: "${value}" not in playlist`;
      throw new Error(emsg);
    }

    return this.cursor;
  }

  static fromCard(card={}) {
    const msg = "Playlist.fromCard()";
    const dbg = DBG.PLAYLIST;
    let { location, context, data } = card;
    switch (context) {
      case EbtCard.CONTEXT_SEARCH:
        dbg && console.log(msg, '[1]search');
        break;
      default: {
        let emsg = `${msg} invalid card context:${context}`;
        throw new Error(emsg);
      }
    }

    let [ pattern, docLang ] = location;
    let suttaRefs = data.reduce((a,result)=>{
      let { author_uid: author, uid:sutta_uid, lang } = result;
      let sr = SuttaRef.create({ sutta_uid, lang, author });
      sr && a.push(sr);
      return a;
    }, []);
    dbg && console.log(msg, '[2]suttaRefs', suttaRefs);
    let docAuthor = suttaRefs[0]?.author;

    let playlist = new Playlist({
      docAuthor,
      docLang,
      pattern,
      suttaRefs,
    });

    return playlist;
  }

  #advanceTipitaka(delta=1) {
    const msg = 'Playlist.#advanceTipitaka()';
    const dbg = DBG.PLAYLIST;
    let sutta_uid = this.cursor.sutta_uid;
    if (delta > 0) {
      while (sutta_uid && delta > 0) {
        sutta_uid = tipitaka.nextSuid(sutta_uid);
        dbg && console.log(msg, ">", sutta_uid);
        delta--;
      }
    } else if (delta < 0) {
      while (sutta_uid && delta < 0) {
        sutta_uid = tipitaka.previousSuid(sutta_uid);
        dbg && console.log(msg, "<", sutta_uid);
        delta++;
      }
    }
    if (!sutta_uid) {
      return false;
    }

    this.cursor.sutta_uid = sutta_uid;
    this.cursor.segnum = undefined;
    this.cursor.scid = sutta_uid;
    return true;
  }

  advance(delta=1) {
    const msg = "Playlist.advance()";
    let { suttaRefs } = this;
    let end = suttaRefs.length - 1;
    if (typeof this._index.value !== 'number') {
      this._index.value = 0;
      return true;
    }
    if (typeof delta !== 'number') {
      let emsg = `${msg} expected number: "${delta}"`;
      throw new Error(emsg);
    }

    if (end === 0) {
      return this.#advanceTipitaka(delta);
    } 

    let newIndex = this._index.value+delta;

    if (newIndex<0 || end<newIndex || newIndex===this._index.value) {
      return false;
    }
    this._index.value = newIndex;
    return true;
  }

  clear() {
    this._index.value = 0;
  }

}


