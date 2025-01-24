import should from "should";
import { setActivePinia, createPinia } from 'pinia';
import { SuttaRef } from 'scv-esm/main.mjs';
import { logger } from "log-instance/index.mjs";
import fetch from "node-fetch";
logger.logLevel = 'warn';

import { 
  useSettingsStore,
  useSuttasStore,
  useVolatileStore,
  useAudioStore,
  IdbSutta,
} from '../src/index.mjs';
import * as Idb from "idb-keyval";
import { ref, shallowRef, watch, watchEffect } from "vue";

const THIG1_1_SOMA = SuttaRef.create('thig1.1/en/soma');

// mock global environment
import "fake-indexeddb/auto";
global.window = {}
import 'mock-local-storage'

const MSSEC = 1000;
const MSDAY = 24*3600*MSSEC;

(typeof describe === 'function') && describe("suttas-store.mjs", function () {
  beforeEach(() => {
    window.localStorage = global.localStorage
    setActivePinia(createPinia());
    global.fetch = global.fetch || fetch;
  });
  it("default state", ()=>{
    let suttas = useSuttasStore();
    should(suttas).properties({
      nFetch: 0,
      nGet: 0,
      nSet: 0,
      maxAge: MSDAY,
    });
  });
  it("suttaUrl", async () => {
    let settings = useSettingsStore();
    should(settings.langTrans).equal('en');
    let langTrans = 'zz';
    settings.langTrans = langTrans;
    should(settings.langTrans).equal(langTrans);
    let suttas = useSuttasStore();
    let server = 'https://www.api.sc-voice.net/scv';
    let suttaRef = SuttaRef.create(THIG1_1_SOMA);
    let docRef = '-dl en -da sujato -rl en -ra sujato -ml1';
    let pattern = encodeURIComponent(`thig1.1/en/soma ${docRef}`);
    should(suttas.suttaUrl(suttaRef)).equal([
      server,
      'search',
      pattern,
      'zz?maxResults=5', 
    ].join('/'));
  });
  it("TESTTESTloadIdbSutta", async () => {
    const msg = 'ts4s.loadIdbSutta';
    const dbg = 0;
    let suttas = useSuttasStore();
    let { nFetch, nGet, nSet } = suttas;
    let suttaRef = SuttaRef.create('thig1.11/en/soma');

    // Load sutta from cloud
    let idbSutta = await suttas.loadIdbSutta(suttaRef);
    let { idbKey } = idbSutta;
    should(idbSutta).properties({
      sutta_uid: 'thig1.11',
      lang: 'en',
      author: 'soma',
    });
    should(suttas.nGet).equal(nGet+1);
    should(suttas.nSet).equal(nSet+1);
    should(suttas.nFetch).equal(nFetch+1);
    let [seg0] = idbSutta.segments;
    should(seg0.en).match(/Elder Bhikkhunīs/);
    should(seg0.pli).match(/Therīgāthā 1.1/);
    let saved = idbSutta.saved;
    should(typeof saved).equal('number');

    // Load cached sutta
    let idbSutta2 = await suttas.loadIdbSutta(suttaRef);
    should.deepEqual(
      Object.keys(idbSutta2).sort(), 
      Object.keys(idbSutta).sort());
    should.deepEqual(idbSutta2, idbSutta);
    should(suttas.nGet).equal(nGet+2);
    should(suttas.nSet).equal(nSet+1);
    should(suttas.nFetch).equal(nFetch+1);

    // Don't refresh almost stale data
    let freshSaved = Date.now() - MSDAY + MSSEC;
    Idb.set(idbKey, 
      Object.assign({}, idbSutta, {saved:freshSaved}));
    let idbSutta3 = await suttas.loadIdbSutta(suttaRef);
    should(idbSutta3.saved).equal(freshSaved);
    should(suttas.nGet).equal(nGet+3);
    should(suttas.nSet).equal(nSet+1);
    should(suttas.nFetch).equal(nFetch+1);

    // Re-fetch stale sutta
    let now = Date.now();
    let staleSaved = now - MSDAY - 1;
    dbg && console.log(msg, {staleSaved});
    Idb.set(idbKey, 
      Object.assign({}, idbSutta, {saved:staleSaved}));
    let idbSutta4 = await suttas.loadIdbSutta(suttaRef);
    let age = now - idbSutta4.saved;
    should(idbSutta4.saved).not.equal(staleSaved);
    dbg && console.log(msg, {age, now, MSDAY});
    should(age).below(MSSEC);
  });
  it("saveIdbSutta()", async () => {
    const msg = 'TS14e.saveIdbSutta:';
    const dbg = 0;
    let suttas = useSuttasStore();
    let { nFetch, nGet, nSet } = suttas;
    let author = 't-author';
    let lang = 't-lang';
    let docLang = 't-doc-lang';
    let docAuthor = 't-doc-author';
    let docAuthorName = 't-doc-author-name';
    let docFooter = 't-doc-footer';
    let refLang = 't-ref-lang';
    let refAuthor = 't-ref-author';
    let refAuthorName = 't-ref-author-name';
    let refFooter = 't-ref-footer';
    let trilingual = true;
    let sutta_uid = "thig1.1";
    let sref = `${sutta_uid}/${docLang}/${docAuthor}`;
    let segments = [{
      "t-suid:0.1": "T-SEGMENT",
    }];
    let mockSettings = { docLang, docAuthor, refLang, refAuthor };
    let idbSutta = IdbSutta.create({ 
      author, lang, sutta_uid, segments, 
      docLang, docAuthor, docAuthorName, docFooter,
      refLang, refAuthor, refAuthorName, refFooter,
      trilingual,
    });
    dbg>1 && console.log(msg, 'idbSutta', idbSutta);

    let idbSuttaSaved = await suttas.saveIdbSutta(idbSutta);
    let saved = idbSuttaSaved.value;
    dbg>1 && console.log(msg, 'idbSuttaSaved', idbSuttaSaved);
    should(saved.docLang).equal(docLang);
    should(saved.docAuthor).equal(docAuthor);
    should(saved.docAuthorName).equal(docAuthorName);
    should(saved.docFooter).equal(docFooter);
    should(saved.refLang).equal(refLang);
    should(saved.refAuthor).equal(refAuthor);
    should(saved.refAuthorName).equal(refAuthorName);
    should(saved.refFooter).equal(refFooter);
    should(saved).properties(idbSutta);
    let now = Date.now();
    should(now - idbSuttaSaved.value.saved).above(-1).below(MSSEC);
    should(suttas.nGet).equal(nGet);
    should(suttas.nSet).equal(nSet+1);

    dbg && console.log(msg, 'settings', mockSettings);
    let loaded = await suttas.loadIdbSutta(sref, {
      settings: mockSettings
    });
    saved = idbSuttaSaved.value;
    //should(loaded.author).equal(saved.author);
    should(loaded.docLang).equal(saved.docLang);
    should(loaded.docAuthor).equal(saved.docAuthor);
    should(loaded.docAuthorName).equal(saved.docAuthorName);
    should(loaded.docFooter).equal(saved.docFooter);
    should(loaded.refLang).equal(saved.refLang);
    should(loaded.refAuthor).equal(saved.refAuthor);
    should(loaded.refAuthorName).equal(saved.refAuthorName);
    should(loaded.refFooter).equal(saved.refFooter);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should(loaded.author).equal(saved.author);
    should.deepEqual(loaded, idbSuttaSaved.value);
    should(suttas.nGet).equal(nGet+1);
    should(suttas.nSet).equal(nSet+1);
  });
  it("ref()", ()=>{
    let obj1 = {count:0, segs: [{text:'A'}]};
    let obj2 = {count:0, segs: [{text:'a'}]};
    let refObj = ref(obj1);
    let nWatch = 0;

    let stop = watch(
      refObj,
      ()=>{ nWatch++; }, 
      {immediate: false, deep: true, flush:'sync'}
    );

    try {

      // ref wraps the object with proxies
      should(refObj.value).not.equal(obj1);

      // changing the object triggers watch
      refObj.value = obj2;
      should(nWatch).equal(1);
      should(refObj.value.count).equal(0);
      should(refObj.value.segs[0].text).equal('a');

      // changing underlying object does nothing
      obj2.count++;
      obj2.segs[0].text = "B";
      should(obj2.count).equal(1);
      should(obj2.segs[0].text).equal("B");
      should(refObj.value.segs[0].text).equal("B");
      should(nWatch).equal(1);

      // changing via reference triggers watch
      refObj.value.count++;
      should(nWatch).equal(2);

      // changing via reference triggers watch
      refObj.value.segs[0].text = 'C';
      should(nWatch).equal(3);
      should(obj2.count).equal(2);
      should(obj2.segs[0].text).equal('C');
      should(refObj.value.segs[0].text).equal('C');

    } finally {
      stop();
    }
  });
  it("shallowRef()", ()=>{
    let obj1 = {count:0, segs: [{text:'A'}]};
    let obj2 = {count:0, segs: [{text:'a'}]};
    let refObj = shallowRef(obj1);
    let nWatch = 0;

    let stop = watch(
      refObj,
      ()=>{ nWatch++; }, 
      {immediate: false, deep: true, flush:'sync'}
    );

    try {

      // shallowRef uses actual object
      should(refObj.value).equal(obj1);  // Different than ref()

      // changing the object triggers watch
      refObj.value = obj2;
      should(nWatch).equal(1);
      should(refObj.value.count).equal(0);
      should(refObj.value.segs[0].text).equal('a');

      // changing underlying object does nothing
      obj2.count++;
      obj2.segs[0].text = "B";
      should(obj2.count).equal(1);
      should(obj2.segs[0].text).equal("B");
      should(refObj.value.segs[0].text).equal("B");
      should(nWatch).equal(1);

      // changing via reference triggers watch
      refObj.value.count++;
      should(nWatch).equal(1);  // Different than ref()

      // changing via reference triggers watch
      refObj.value.segs[0].text = 'C';
      should(nWatch).equal(1);  // Different than ref()
      should(obj2.count).equal(2);
      should(obj2.segs[0].text).equal('C');
      should(refObj.value.segs[0].text).equal('C');

    } finally {
      stop();
    }
  });
  it("getIdbSuttaRef()", async () => {
    let suttas = useSuttasStore();
    let suttaRef = SuttaRef.create("thig1.1/en/soma");
    let { sutta_uid, lang, author } = suttaRef;

    // return shallowRef() of volatile idbSutta, fetching if needed
    let idbSuttaRef = await suttas.getIdbSuttaRef(suttaRef);
    should(idbSuttaRef.value.sutta_uid).equal(sutta_uid);
    should(idbSuttaRef.value.lang).equal(lang);
    should(idbSuttaRef.value.author).equal(author);
    let idbSuttaRef2 = await suttas.getIdbSuttaRef(suttaRef);
    should(idbSuttaRef2.value.sutta_uid).equal(sutta_uid);
    should(idbSuttaRef2.value.lang).equal(lang);
    should(idbSuttaRef2.value.author).equal(author);
    should(idbSuttaRef2).equal(idbSuttaRef);

    // refresh is true by default
    let noRefresh = await suttas
      .getIdbSuttaRef("thig1.10/en/soma", {refresh:false});
    should(noRefresh).equal(null);
  });
  it("getIdbSuttaRef() fails", async () => {
    let suttas = useSuttasStore();
    let eCaught;
    let oldLogLevel = logger.logLevel;

    try { 
      logger.logLevel = "error";
      await suttas.getIdbSuttaRef("xyz"); 
    } catch(e) {eCaught=e;}
    finally { 
      logger.logLevel = oldLogLevel;
      should(eCaught?.message).match(/invalid sutta.*xyz/i);
    }
  });
})
