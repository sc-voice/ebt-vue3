import { logger } from "log-instance/index.mjs";
import should from "should";
import { setActivePinia, createPinia } from 'pinia';
import "fake-indexeddb/auto";
import { SuttaRef } from "scv-esm/main.mjs";
import { default as IdbSutta } from "../src/idb-sutta.mjs";
import * as Idb from "idb-keyval";

const TESTLANG = 'testlang';

const TESTSEG1_0 = {
  scid: "testsuid:1.0",
  [TESTLANG]: `testsuid:1.0-${TESTLANG}`,
  ref: "testsuid:1.0-ref",
  pli: "testsuid:1.0-pli",
};
const TESTSEG1_1 = {
  scid: "testsuid:1.1",
  [TESTLANG]: "testsuid:1.1-testlang apex.",
  ref: "testsuid:1.1-ref apex.",
  pli: "testsuid:1.1-ref pali",
};
const TESTSEG1_1_EN = {
  scid: "testsuid:1.1",
  en: "testsuid:1.1-en apex.",
  ref: "testsuid:1.1-ref apex.",
  pli: "testsuid:1.1-ref pali",
};
const TESTSEG1_2 = {
  scid: "testsuid:1.2",
  [TESTLANG]: "testsuid:1.2-testlang",
  ref: "testsuid:1.2-ref",
  pli: "testsuid:1.2-pli",
};
const TESTSEG1_2A = {
  scid: "testsuid:1.2",
  [TESTLANG]: "testsuid:1.2-testlangtA",
  ref: "testsuid:1.2-ref",
  pli: "testsuid:1.2-pli",
};
const TESTSEG1_3 = {
  scid: "testsuid:1.3",
  [TESTLANG]: "testsuid:1.3-text",
  ref: "testsuid:1.3-ref",
  pli: "testsuid:1.3-pli",
};
const TESTMAP = {
  [TESTSEG1_0.scid]: TESTSEG1_0,
  [TESTSEG1_1.scid]: TESTSEG1_1,
  [TESTSEG1_2.scid]: TESTSEG1_2,
};
const TESTMAP_EN = {
  [TESTSEG1_0.scid]: TESTSEG1_0,
  [TESTSEG1_1.scid]: TESTSEG1_1_EN,
  [TESTSEG1_2.scid]: TESTSEG1_2,
};
const TESTSEGS = [
  TESTSEG1_0,
  TESTSEG1_1,
  TESTSEG1_2,
];
const TESTMLDOC = {
  sutta_uid: 'testsuid',
  lang: TESTLANG,
  author_uid: 'test-author',
  segMap: TESTMAP,
};
const TESTMLDOC_EN = {
  sutta_uid: 'testsuid',
  lang: 'en',
  author_uid: 'test-author',
  segMap: TESTMAP_EN,
};

(typeof describe === 'function') && describe("idb-sutta.mjs", ()=>{
  beforeEach(() => {
    setActivePinia(createPinia());
    logger.logLevel = "warn";
  });
  it("private ctor", async () => {
    logger.logLevel = "error";
    let sutta_uid = "testsuid";
    let lang = TESTLANG;
    let author = 'test-author';
    let segMap = TESTMAP;
    let mlDoc = { sutta_uid, lang, author_uid:author, segMap, }
    let eCaught;
    try { new IdbSutta(); } catch(e) { eCaught = e; }
    should(eCaught?.message).match(/use idbSutta.create/i);
    eCaught = undefined;
    try { new IdbSutta(mlDoc); } catch(e) { eCaught = e; }
    should(eCaught?.message).match(/use idbSutta.create/i);
  });
  it("create(mlDoc)", ()=>{
    logger.logLevel = "error";
    let sutta_uid = "testsuid";
    let lang = TESTLANG;
    let author = 'test-author';
    let segMap = TESTMAP;
    let title = 'test-title';
    let docLang = 'test-doc-lang';
    let docAuthor = 'test-doc-author';
    let docAuthorName = 'test-doc-author-name';
    let docFooter = 'test-doc-footer';
    let refLang = 'test-ref-lang';
    let refAuthor = 'test-ref-author';
    let refAuthorName = 'test-ref-author-name';
    let refFooter = 'test-ref-footer';
    let trilingual = true;
    let mlDoc = { 
      sutta_uid, lang, author_uid:author, title, segMap, 
      docLang, docAuthor, docAuthorName, docFooter,
      refLang, refAuthor, refAuthorName, refFooter,
      trilingual
    }
    let sutta = IdbSutta.create(mlDoc);
    should(sutta.trilingual).equal(true);
    should(sutta.docLang).equal(docLang);
    should(sutta.docAuthor).equal(docAuthor);
    should(sutta.docAuthorName).equal(docAuthorName);
    should(sutta.docFooter).equal(docFooter);
    should(sutta.refLang).equal(refLang);
    should(sutta.refAuthor).equal(refAuthor);
    should(sutta.refAuthorName).equal(refAuthorName);
    should(sutta.refFooter).equal(refFooter);
    should(sutta).properties({ sutta_uid, title, });
    should.deepEqual(sutta.segments, TESTSEGS);
  });
  it("create(mlDoc) segment order", ()=>{
    logger.logLevel = "error";
    let sutta_uid = "testsuid";
    let lang = TESTLANG;
    let author = 'test-author';
    let segMap = {};
    // This test checks that segments are ordered correctly 
    // even if segMap is constructed out of order
    for (let i = TESTSEGS.length; i--;) {
      segMap[TESTSEGS[i].scid] = TESTSEGS[i];
    }
    let mlDoc = { sutta_uid, lang, author_uid:author, segMap, }
    let sutta = IdbSutta.create(mlDoc);
    should(sutta).properties({
      sutta_uid,
      lang, 
      author,
    });
    should.deepEqual(sutta.segments, TESTSEGS);
  });
  it("create(mlDocProxy)", ()=>{
    logger.logLevel = "error";
    let sutta_uid = "testsuid";
    let lang = TESTLANG;
    let author = 'test-author';
    let title = 'test-title';
    let segMap = TESTMAP;
    let mlDoc = { sutta_uid, lang, author_uid:author, title, segMap, }
    let sutta = IdbSutta.create(mlDoc);
    should(sutta).properties({ sutta_uid, lang, author, title });
    should.deepEqual(sutta.segments, TESTSEGS);
  });
  it("create(idbSutta)", ()=>{
    logger.logLevel = "error";
    let sutta_uid = "testsuid";
    let lang = TESTLANG;
    let author = 'test-author';
    let title = 'test-title';
    let segMap = TESTMAP;
    let mlDoc = { sutta_uid, lang, author_uid:author, title, segMap, }
    let sutta = IdbSutta.create(mlDoc);
    let sutta2 = IdbSutta.create(sutta);
    let sutta3 = IdbSutta.create(new Proxy(sutta, {}));
    should.deepEqual(sutta2, sutta);
    should.deepEqual(sutta3, sutta);
  });
  it("serialize", ()=>{
    logger.logLevel = "error";
    let sutta_uid = "testsuid";
    let lang = TESTLANG;
    let author = 'test-author';
    let title = 'test-title';
    let segments = TESTMAP;
    let sutta = IdbSutta.create({sutta_uid, lang, author, title, segments});
    let json = JSON.stringify(sutta);
    let sutta2 = IdbSutta.create(JSON.parse(json));
    should.deepEqual(sutta2, sutta);
  });
  it("suttaRefToIdbKey", ()=>{
    let sref = 'thig1.1/en/soma';
    should(IdbSutta.suttaRefToIdbKey(sref))
    .equal('thig1.1/en/soma/en/sujato');
  });
  it("suttaRefToIdbKey settings", ()=>{
    let settings = {
      docLang: 'de',
      docAuthor: 'sabbamitta',
      refLang: 'en',
      refAuthor: 'soma',
    }
    should(IdbSutta.suttaRefToIdbKey('thig1.1', settings))
    .equal('thig1.1/de/sabbamitta/en/soma');
    should(IdbSutta.suttaRefToIdbKey('thig1.1/de', settings))
    .equal('thig1.1/de/sabbamitta/en/soma');
    should(IdbSutta.suttaRefToIdbKey('thig1.1/de/sabbamitta', settings))
    .equal('thig1.1/de/sabbamitta/en/soma');
    should(IdbSutta.suttaRefToIdbKey('thig1.1/en', settings))
    .equal('thig1.1/en/sujato/en/soma');
    should(IdbSutta.suttaRefToIdbKey('thig1.1/en/sujato', settings))
    .equal('thig1.1/en/sujato/en/soma');
    should(IdbSutta.suttaRefToIdbKey('thig1.1/fr', settings))
    .equal('thig1.1/fr/noeismet/en/soma');
    should(IdbSutta.suttaRefToIdbKey('thig1.1/fr/wijayaratna', settings))
    .equal('thig1.1/fr/wijayaratna/en/soma');
  });
  it("suttaRefToIdbKey an1.1-10", ()=>{
    let sref = 'an1.1-10:1.2'; 
    let settings = {
      docLang: 'de',
      refLang: 'en',
      refAuthor: 'soma',
    }
    should(IdbSutta.suttaRefToIdbKey(sref, settings))
    .equal('an1.1-10/de/sabbamitta/en/soma');
  });
  it("idbKey", ()=>{
    let sutta_uid = 'test-sutta-uid';
    let docLang = 'test-doc-lang';
    let docAuthor = 'test-doc-author';
    let refLang = 'test-ref-lang';
    let refAuthor = 'test-ref-author';
    should(IdbSutta.idbKey({ 
      sutta_uid, docLang, docAuthor, refLang, refAuthor 
    })).equal([ 
      sutta_uid, docLang, docAuthor, refLang, refAuthor 
    ].join('/'));

    should(IdbSutta.idbKey({ sutta_uid, docLang, docAuthor })).equal([ 
      sutta_uid, docLang, docAuthor, 'en', 'sujato',
    ].join('/'));

    should(IdbSutta.idbKey({ sutta_uid })).equal([ 
      sutta_uid, 'en', 'sujato', 'en', 'sujato',
    ].join('/'));
  });
  it("idbKey settings", ()=>{
    let args = {
      sutta_uid: 'thig1.1',
      docLang: 'de',
      refLang: 'en',
      refAuthor: 'soma',
    }
    should(IdbSutta.idbKey(args))
    .equal('thig1.1/de/sabbamitta/en/soma');
  });
  it("idbKey an1.1-10", ()=>{
    let args = {
      sutta_uid: 'an1.1-10', 
      docLang: 'de',
      refLang: 'en',
      refAuthor: 'soma',
    }
    should(IdbSutta.idbKey(args))
    .equal('an1.1-10/de/sabbamitta/en/soma');
  });
  it("merge mlDoc lang", ()=>{
    logger.logLevel = "error";
    let sutta = IdbSutta.create(TESTMLDOC);
    let dstSutta = IdbSutta.create(TESTMLDOC);
    let sutta_uid = 'testsuid';
    let lang = TESTLANG;
    let title = 'test-title';
    let author_uid = 'test-author';
    let updatedSeg1_1 = Object.assign({}, TESTSEG1_1, {
      matched: true,
      [lang]: "test-update",
    });
    let srcSegMap = {
      [TESTSEG1_0.scid]: new Proxy(TESTSEG1_0, {}),
      [TESTSEG1_1.scid]: new Proxy(updatedSeg1_1, {}),
      [TESTSEG1_3.scid]: TESTSEG1_3,
    }
    let mlDoc = { sutta_uid, lang, author_uid, title, segMap:srcSegMap, }

    // Merge updates and adds but does not delete
    dstSutta.merge({mlDoc});
    should(dstSutta).properties({sutta_uid, lang, author:author_uid, title});
    should.deepEqual(dstSutta.segments, [
      TESTSEG1_0,    // existing
      updatedSeg1_1, // updated
      TESTSEG1_2,    // existing
      TESTSEG1_3,    // new segment
    ]);
  });
  it("merge mlDoc matched", ()=>{
    logger.logLevel = "error";
    let sutta = IdbSutta.create(TESTMLDOC);
    let dstSutta = IdbSutta.create(TESTMLDOC);
    let sutta_uid = 'testsuid';
    let lang = TESTLANG;
    let author_uid = 'test-author';
    logger.logLevel = "error";

    // Mark all dstSutta segments as matched:true
    dstSutta.segments.forEach(seg=>seg.matched = true);

    // Only updated segment is matched
    let updatedSeg1_1 = Object.assign({}, TESTSEG1_1, {
      matched: true,
      [lang]: "test-update",
    });
    let srcSegMap = {
      [TESTSEG1_0.scid]: new Proxy(TESTSEG1_0, {}),
      [TESTSEG1_1.scid]: new Proxy(updatedSeg1_1, {}),
      //[TESTSEG1_2.scid]: TESTSEG1_2,  // don't update 
      [TESTSEG1_3.scid]: TESTSEG1_3,
    }
    let mlDoc = { sutta_uid, lang, author_uid, segMap:srcSegMap, }

    // Merge updates and adds but does not delete
    dstSutta.merge({mlDoc});
    should(dstSutta).properties({sutta_uid, lang, author: author_uid});
    should.deepEqual(dstSutta.segments, [
      TESTSEG1_0,    // cleared matched
      updatedSeg1_1, // new matched
      Object.assign({matched:true}, TESTSEG1_2),   // ignored existing matched
      TESTSEG1_3,    // new segment has no matched
    ]);
  });
  it("merge mlDoc refLang", ()=>{
    logger.logLevel = "error";
    let sutta = IdbSutta.create(TESTMLDOC);
    let dstSutta = IdbSutta.create(TESTMLDOC);
    let sutta_uid = 'testsuid';
    let lang = 'ref-lang';
    let refLang = TESTMLDOC.lang;
    let author_uid = 'ref-author';
    let updatedSeg1_1 = {
      scid: TESTSEG1_1.scid,
      [lang]: "test-update",
    }
    let srcSegMap = {
      [TESTSEG1_0.scid]: new Proxy(TESTSEG1_0, {}),
      [TESTSEG1_1.scid]: new Proxy(updatedSeg1_1, {}),
      [TESTSEG1_3.scid]: TESTSEG1_3,
    }
    let mlDoc = { sutta_uid, lang, author_uid, segMap:srcSegMap, }

    // Merge with refLang creates a "ref" property with value
    // obtained from sourceSegment[refLang]
    dstSutta.merge({mlDoc, refLang});
    should(dstSutta).properties({
      sutta_uid, 
      lang: TESTMLDOC.lang,
      author: TESTMLDOC.author_uid,
      refAuthor: author_uid,
      refLang,
    });
    should.deepEqual(dstSutta.segments[0], 
      Object.assign({}, TESTSEG1_0, {ref:TESTSEG1_0.testlang}) // updated old seg
    ); 
    should.deepEqual(dstSutta.segments[1], 
      Object.assign({}, TESTSEG1_1, {ref:updatedSeg1_1.testlang}), // updated old seg
    );
    should.deepEqual(dstSutta.segments[2], 
      TESTSEG1_2,
    );
    should.deepEqual(dstSutta.segments[3], 
      Object.assign({scid:TESTSEG1_3.scid, ref:TESTSEG1_3.testlang}), // new seg
    );
    should(dstSutta.segments.length).equal(4);
  });
  it("TESTTESThighlightExamples()", async function() {
    this.timeout(5000); // Examples.replaceAll requires time to load/process data
    logger.logLevel = "error";
    let suttaBefore = IdbSutta.create(TESTMLDOC_EN);
    let suttaAfter = IdbSutta.create(TESTMLDOC_EN);
    let lang = 'en';
    await suttaAfter.highlightExamples({lang});
    let [ before0, before1, before2 ] = suttaBefore.segments;
    let [ after0, after1, after2 ] = suttaAfter.segments;
    should.deepEqual(after0, before0);
    should.deepEqual(after1.ref, before1.ref);
    should.deepEqual(after1[lang],
      'testsuid:1.1-en <span class="ebt-example">apex</span>.');
    should.deepEqual(after2, before2);
  });
});
