import { defineStore } from 'pinia';
import { logger } from 'log-instance/index.mjs';
import Utils from "../utils.mjs";
import { SuttaRef } from 'scv-esm/main.mjs';
import { useSettingsStore } from './settings.mjs';
import { useVolatileStore } from './volatile.mjs';
import { default as IdbSutta } from '../idb-sutta.mjs';
import { ref, shallowRef } from 'vue';
import * as Idb from 'idb-keyval';
import { DEBUG_LOAD } from '../defines.mjs';

const MSDAY = 24 * 3600 * 1000;
const VUEREFS = new Map();

const msg = 'stores.suttas.';

export const useSuttasStore = defineStore('suttas', {
  state: () => {
    return {
      maxAge: MSDAY,
      nFetch: 0,
      nGet: 0,
      nSet: 0,
    }
  },
  actions: {
    suttaUrl(idOrRef) {
      let settings = useSettingsStore();
      let { 
        langTrans, serverUrl, docLang, docAuthor, 
      } = settings;
      let volatile = useVolatileStore();
      let suttaRef = SuttaRef.create(idOrRef, langTrans);
      let { sutta_uid, lang, author, segnum } = suttaRef;
      let search = `${sutta_uid}/${lang}`;
      author && (search += `/${author}`);
      let url = volatile.searchUrl(search);
      return url;
    },
    async loadIdbSutta(suttaRef, opts={}) { // low-level API
      const msg = `suttas.loadIdbSutta(${suttaRef})`;
      let { maxAge } = this;
      let { refresh=false } = opts;
      let idbKey = IdbSutta.idbKey(suttaRef);
      let idbData = await Idb.get(idbKey);
      this.nGet++;
      let age = idbData?.saved ? Date.now()-idbData.saved : maxAge+1;
      let idbSutta;
      let dbg = DEBUG_LOAD;

      if (refresh || !idbData || maxAge < age) {
        let volatile = useVolatileStore();
        let url = this.suttaUrl(suttaRef);
        let json = await volatile.fetchJson(url);
        this.nFetch++;
        let { mlDocs, results } = json;
        if (mlDocs.length < 1) {
          let msg = `sutta not found: ${url}`;
          volatile.alert(msg);
          return null;
        }
        idbSutta = IdbSutta.create(mlDocs[0]);
        dbg && console.log(msg, `${url} => `,
          `segments:${idbSutta.segments.length}`);
        await this.saveIdbSutta(idbSutta);
      } else {
        dbg && console.log(msg, `cached idb(${idbKey})`);
        idbSutta = IdbSutta.create(idbData);
      } 

      return idbSutta;
    },
    async saveIdbSutta(idbSutta) { // low-level API
      const msg = 'suttas.saveIdbSutta()';
      let { idbKey } = idbSutta;
      let vueRef = VUEREFS.get(idbKey);
      let dbg = DEBUG_LOAD;
      if (vueRef == null) {
        vueRef = ref(idbSutta);
        VUEREFS.set(idbKey, vueRef);
        idbSutta.saved = Date.now();
        dbg && console.log(msg, 'ADD', idbKey, idbSutta.saved);
      } else if (vueRef.value !== idbSutta) {
        vueRef.value = idbSutta;
        idbSutta.saved = Date.now();
        dbg && console.log(msg, 'UPDATE', idbKey, idbSutta.saved);
      }
      let settings = useSettingsStore();
      let { highlightExamples } = settings;
      if (highlightExamples) {
        idbSutta.highlightExamples();
      }
      await Idb.set(idbKey, idbSutta);
      this.nSet++;
      return vueRef;
    },
    async getIdbSuttaRef(suttaRef, opts={refresh:true}) { // get/post API
      const msg = `suttas.getIdbSuttaRef(${suttaRef})`;
      try {
        let idbKey = IdbSutta.idbKey(suttaRef);
        let vueRef = VUEREFS.get(idbKey);
        let idbSutta = vueRef?.value;
        let dbg = DEBUG_LOAD;

        if (idbSutta == null) {
          if (!opts.refresh) {
            return null;
          }
          let promise = this.loadIdbSutta(suttaRef);
          vueRef = ref(promise);
          VUEREFS.set(idbKey, vueRef);

          idbSutta = await promise;
          dbg && console.log(msg, {idbKey}, idbSutta);
          vueRef.value = idbSutta;
          VUEREFS.set(idbKey, vueRef);
        } else {
          if (vueRef.value instanceof Promise) {
            vueRef.value = await vueRef.value;
          }
          dbg && console.log(msg, 'found', {idbKey, idbSutta});
        }

        return vueRef;
      } catch(e) {
        logger.warn(e);
        throw e;
      }
    },
  },
  getters: {
  },
})