import should from "should";
import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { setActivePinia, createPinia } from 'pinia';
import { SuttaRef } from 'scv-esm/main.mjs';
import fetch from "node-fetch";

import { 
  useSettingsStore,
  useSuttasStore,
  useVolatileStore,
  useAudioStore,
} from '../src/index.mjs';
import { DBG } from '../src/defines.mjs'
import { ref } from "vue";

// mock global environment
import "fake-indexeddb/auto";
global.window = {}
import 'mock-local-storage'

const MSSEC = 1000;
const MSDAY = 24*3600*MSSEC;

(typeof describe === 'function') && 
  describe("volatile-store.mjs", function () {
  beforeEach(() => {
    window.localStorage = global.localStorage
    setActivePinia(createPinia());
    global.fetch = global.fetch || fetch;
  });
  it("default state", ()=>{
    let volatile = useVolatileStore();
  });
  it("TESTTESTsearchResults() => search-thig.json", async ()=>{
    const msg = "test.searchResults()";
    const dbg = DBG.TEST_WITH_FETCH;
    if (dbg) { // write out searchResults
      let volatile = useVolatileStore();
      let author = 'soma';
      let lang = 'en';
      let search = `thig1.1-3 -dl ${lang} -da ${author}`;
      let opts = {cached: false};
      let res = await volatile.searchResults(search, opts);
      let { docLang, docAuthor, suttaRefs } = res;
      let json = JSON.stringify(res, null, 2);
      should(docAuthor).equal(author);
      should(docLang).equal(lang);
      should.deepEqual(suttaRefs.map(sr=>sr.toString()), [
        'thig1.1/en/soma',
        'thig1.2/en/soma',
        'thig1.3/en/soma',
      ])
      let testPath = `${__dirname}/data/search-thig.json`;
      console.log(msg, 'writing out', testPath);
      await fs.promises.writeFile(testPath, json);
    }
  });
  it("TESTTESTsearchResults() schlafe sanft", async ()=>{
    const msg = "test.volatila@55";
    if (!DBG.TEST_WITH_FETCH) {
      console.log(msg, "skipping test with fetch()...");
      return;
    }

    let volatile = useVolatileStore();
    let settings = useSettingsStore();
    let lang = "de";
    let author = "sabbamitta";
    let search = `schlafe sanft -dl ${lang} -da ${author}`;
    let opts = {cached: false};

    // Simulate Dhammaregen
    let saveLangTrans = settings.langTrans;
    settings.langTrans = lang;
    let results = await volatile.searchResults(search, opts);
    settings.langTrans = saveLangTrans;

    let json = JSON.stringify(results, null, 2);
    let testPath = `${__dirname}/data/search-schlafe.json`;
    console.log(msg, 'writing out', testPath);
    await fs.promises.writeFile(testPath, json);

    let { res, docAuthor, docLang, suttaRefs } = results;
    should(docAuthor).equal(author);
    should(docLang).equal(lang);
    should.deepEqual(suttaRefs.map(sr=>sr.toString()), [
      "thig1.16/de/sabbamitta",
      "thig1.1/de/sabbamitta",
    ]);
  });
})
