
import { logger } from 'log-instance/index.mjs';
import { useSettingsStore } from './stores/settings.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { useAudioStore } from './stores/audio.mjs';
import { AuthorsV2, SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from './defines.mjs'


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
      index,
      pattern,
      suttaRefs,
    });
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
      this.index = i;
      return true;
    }, false);
    if (!exists) {
      let emsg = `${msg}: "${value}" not in playlist`;
      throw new Error(emsg);
    }

    return this.cursor;
  }

  advance(delta=1) {
    const msg = "Playlist.advance()";
    let { index, suttaRefs } = this;
    let end = suttaRefs.length - 1;
    if (typeof index !== 'number') {
      index = 0;
      return true;
    }
    if (typeof delta !== 'number') {
      let emsg = `${msg} expected number: "${delta}"`;
      throw new Error(emsg);
    }

    let newIndex = index+delta;
    if (newIndex<0 || end<newIndex || newIndex===index) {
      return false;
    }
    this.index = newIndex;
    return true;
  }
}


