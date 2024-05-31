
import { useSettingsStore } from './stores/settings.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { useAudioStore } from './stores/audio.mjs';
import { ref } from 'vue';
import { default as EbtCard } from './ebt-card.mjs';
import { Tipitaka, AuthorsV2, SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from './defines.mjs'

const tipitaka = new Tipitaka();

export default class Playlist {
  #index = ref(0);
  #suttaRefs = ref([]);

  constructor(opts={}) {
    const msg = "playlist.ctor()";
    const dbg = DBG.PLAYLIST;
    const dbgv = DBG.VERBOSE && dbg;
    let settings = useSettingsStore();

    let {
      docLang = settings?.docLang,
      docAuthor = settings?.docAuthor,
      index,
      pattern,
      suttaRefs,
    } = opts;

    if (suttaRefs) {
      suttaRefs = suttaRefs.map(sr=>{
        let suttaRef = SuttaRef.create(sr, docLang);
        suttaRef.author = suttaRef.author || 
          AuthorsV2.langAuthor(suttaRef.lang);
        return suttaRef;
      });
    }

    Object.assign(this, {
      docAuthor,
      docLang,
      pattern,
    });

    Object.defineProperty(this, "index", {
      get: ()=>{
        return this.#index.value;
      },
      set: (value)=>{
        if (typeof value !== 'number') {
          throw new Error(`Expected number: ${value}`);
        }
        this.#index.value = value;
      },
      enumerable: true,
    });
    Object.defineProperty(this, "suttaRefs", {
      get: ()=>{
        return this.#suttaRefs.value;
      },
      set: (value)=>{
        this.#suttaRefs.value = value;
      },
      enumerable: true,
    });
    this.suttaRefs = suttaRefs;

    if (index) {
      this.index = index;
    }

    if (dbg) {
      if (dbgv) {
        console.log(msg, JSON.stringify(this, null, 2));
      } else {
        console.log(msg, 
          this.suttaRefs.map((sr,i)=>{
            return i === this.index
              ? `<${sr.toString()}>`
              : sr.toString();
          }).join(', ')
        );
      }
    }
  }

  static get tipitaka() {
    return tipitaka;
  }

  get length() {
    return this.suttaRefs?.length || 0;
  }

  get page() {
    return this.index+1;
  }

  set page(value) {
    return this.index = value-1;
  }

  get cursor() {
    let { index, suttaRefs } = this;
    let sr = suttaRefs && suttaRefs[index];
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
    if (suttaRefs==null) {
      return false;
    }
    let end = suttaRefs.length - 1;
    if (typeof this.index !== 'number') {
      this.index = 0;
      return true;
    }
    if (typeof delta !== 'number') {
      let emsg = `${msg} expected number: "${delta}"`;
      throw new Error(emsg);
    }

    if (end === 0) {
      return this.#advanceTipitaka(delta);
    } 

    let newIndex = this.index+delta;

    if (newIndex<0 || end<newIndex || newIndex===this.index) {
      return false;
    }
    this.index = newIndex;
    return true;
  }

  clear() {
    this.index = 0;
  }

  async resolveLocation(location, searcher) {
    const msg = 'Playlist.resolvePlaylist()';
    const dbg = DBG.PLAYLIST;
    let sref = SuttaRef.create(location.slice(0,3).join('/'));
    let pattern = location[3];

    if (searcher == null) {
      console.log(msg, "MOCK");
      searcher = async (pattern)=>{
        // Mock suttarefs
        const MOCK_SUTTAREFS = [
          SuttaRef.create("thig1.1/en/soma"), 
          SuttaRef.create("thig1.2/en/soma"), 
          SuttaRef.create("thig1.3/en/soma"),
          SuttaRef.create("thig1.4/en/soma"),
          SuttaRef.create("thig1.5/en/soma"),
          SuttaRef.create("thig1.6/en/soma"),
          SuttaRef.create("thig1.7/en/soma"),
        ].slice(0,3);
        await new Promise(s=>setTimeout(()=>s(),1000));
        dbg && console.log(msg, 'adding suttarefs', {
          playlist:Object.assign({},this), 
          sref,
        });

        return {
          docLang: 'en',
          docAuthor: 'soma',
          suttaRefs: MOCK_SUTTAREFS,
        }
      }
    }

    let { docLang, docAuthor, suttaRefs } = await searcher(pattern);
    this.suttaRefs = suttaRefs;
    this.docLang = docLang;
    this.docAuthor = docAuthor;

    sref = sref || this.suttaRefs[0];
    sref && this.suttaRefs.forEach((sr,i)=>{ // update scid
      if (sr.sutta_uid === sref.sutta_uid) {
        sr.scid = sref.scid;
        sr.segnum = sref.segnum;
        this.index = i;
        this.docAuthor = sref.author;
        this.docLang = sref.lang;
      }
    });

    return this;
  }

}
