import { defineStore } from 'pinia';
import { logger } from 'log-instance/index.mjs';
import { SuttaRef } from 'scv-esm/main.mjs';
import { useSettingsStore } from './settings.mjs';
import { useVolatileStore } from './volatile.mjs';
import { default as IdbSutta } from '../idb-sutta.mjs';
import { ref, shallowRef } from 'vue';
import * as Idb from 'idb-keyval';
import { 
  DBG, DBG_LOAD, 
} from '../defines.mjs';

const MSDAY = 24 * 3600 * 1000;
const VUEREFS = new Map();

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
      const msg = 'suttas.suttaUrl()';
      const dbg = DBG.IDB_SUTTA;
      let settings = useSettingsStore();
      let { langTrans, } = settings;
      let volatile = useVolatileStore();
      let suttaRef = SuttaRef.create(idOrRef, langTrans);
      let { sutta_uid, lang, author, } = suttaRef;
      let search = `${sutta_uid}/${lang}`;
      author && (search += `/${author}`);
      let url = volatile.searchUrl(search);
      dbg && console.log(msg, '[1]', {sutta_uid, lang, author, url});
      return url;
    },
    async loadIdbSutta(suttaRef, opts={}) { // low-level API
      const msg = 's4s.loadIdbSutta:';
      const dbg = DBG_LOAD || DBG.S4S_LOAD_IDB_SUTTA;
      suttaRef = SuttaRef.create(suttaRef);
      let { 
        settings = useSettingsStore(), 
        refresh=false,
      } = opts;
      let sref = suttaRef.toString();
      let idbKey = IdbSutta.suttaRefToIdbKey(suttaRef, settings);
      dbg && console.log(msg, '[1.0]idbKey', suttaRef, idbKey);
      let { maxAge } = this;
      let idbData = await Idb.get(idbKey);
      this.nGet++;
      let age = idbData?.saved ? Date.now()-idbData.saved : maxAge+1;
      let idbSutta;
      let fetchSutta = false;

      if (!idbData) {
        fetchSutta = true;
        dbg && console.log(msg, '[1.1]!cached', idbKey);
      } else if (refresh) {
        fetchSutta = true;
        dbg && console.log(msg, '[1.2]refersh', idbKey);
      } else if (maxAge < age) {
        fetchSutta = true;
        dbg && console.log(msg, `[1.3]maxAge:${maxAge}<age${age}`);
      }
      if (fetchSutta) {
        let volatile = useVolatileStore();
        let url = this.suttaUrl(suttaRef);
        volatile.waitBegin('ebt.loadingSutta', undefined, sref);
        let json = await volatile.fetchJson(url);
        volatile.waitEnd('ebt.loadingSutta', undefined, msg);
        this.nFetch++;
        let { mlDocs, } = json;
        if (mlDocs.length < 1) {
          let msg = `sutta not found: ${url}`;
          volatile.alert(msg);
          return null;
        }
        idbSutta = IdbSutta.create(mlDocs[0]);
        dbg && console.log(msg, `[2]${url}=>`,
          `segments:${idbSutta.segments.length}`);
        await this.saveIdbSutta(idbSutta);
      } else {
        dbg && console.log(msg, '[3]cached', idbKey);
        idbSutta = IdbSutta.create(idbData);
      } 

      return idbSutta;
    },
    async saveIdbSutta(idbSutta) { // low-level API
      const msg = 'S4s.saveIdbSutta()';
      const dbg = DBG_LOAD || DBG.IDB_SUTTA || DBG.S4S_SAVE_IDB_SUTTA;
      let { idbKey } = idbSutta;
      let vueRef = VUEREFS.get(idbKey);
      if (vueRef == null) {
        vueRef = ref(idbSutta);
        let saved = Date.now();
        idbSutta.saved = saved;
        if (dbg) {
          if (dbg === 1) {
            console.log(msg, '[1.1]VUEREFS.set', {idbKey, saved});
          } else {
            console.log(msg, '[1.2]VUEREFS.set', {idbKey, idbSutta});
          }
        }
        VUEREFS.set(idbKey, vueRef);
      } else if (vueRef.value !== idbSutta) {
        dbg && console.log(msg, '[2]vueRef <=', {
          idbKey, vueRef, idbSutta});
        vueRef.value = idbSutta;
        idbSutta.saved = Date.now();
        dbg && console.log(msg, '[3]saved', idbKey, idbSutta.saved);
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
      const msg = `suttas.getIdbSuttaRef()`;
      const dbg = DBG_LOAD || DBG.IDB_SUTTA;
      const dbgv = DBG.VERBOSE && dbg;
      let settings = useSettingsStore();
      try {
        let idbKey = IdbSutta.suttaRefToIdbKey(suttaRef, settings);
        let vueRef = VUEREFS.get(idbKey);
        let idbSutta = vueRef?.value;

        if (idbSutta == null) {
          if (!opts.refresh) {
            return null;
          }
          let promise = this.loadIdbSutta(suttaRef);
          vueRef = ref(promise);
          dbg && console.log(msg, '[1]VUEREFS.set', {idbKey, vueRef});
          VUEREFS.set(idbKey, vueRef);

          idbSutta = await promise;
          dbg && console.log(msg, '[2]vueRef.value', {idbSutta, idbKey});
          vueRef.value = idbSutta;
          VUEREFS.set(idbKey, vueRef);
        } else {
          let vueRefValue = vueRef.value;
          if (vueRefValue instanceof Promise) {
            vueRef.value = await vueRefValue;
            dbg && console.log(msg, '[3]vueRef.value', vueRef.value);
          }
          dbgv && console.log(msg, '[4]found', idbKey, idbSutta);
        }

        return vueRef;
      } catch(e) {
        const emsg = `${e.message}\n\tin ${msg}`;
        dbg && console.warn(emsg);
        throw e;
      }
    },
  },
  getters: {
  },
})
