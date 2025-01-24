import { logger } from 'log-instance/index.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { 
  Examples, AuthorsV2, SuttaRef, SuttaCentralId 
} from 'scv-esm/main.mjs';
import { DBG } from './defines.mjs';
import * as Idb from "idb-keyval";

const OPTIONAL_PROPS = ['saved', 
  'refLang', 'refAuthor', 'refAuthorName', 'refFooter',
  'docLang', 'docAuthor', 'docAuthorName', 'docFooter',
];
const EXAMPLE_CLASS = 'ebt-example';
const RE_EXAMPLE_CLASS = new RegExp(EXAMPLE_CLASS);
const EXAMPLE_TEMPLATE = `<span class="${EXAMPLE_CLASS}">\$&</span>`;

const msg = 'IdbSuttas.';

export default class IdbSutta {
  static #privateCtor;

  constructor(opts = {}) {
    const msg = 'IdbSutta.ctor()';
    const dbg = DBG.IDB_SUTTA;
    if (!IdbSutta.#privateCtor) {
      throw new Error("use IdbSutta.create()");
    }

    dbg && console.log(msg, opts);
    Object.assign(this, opts);
  }
  
  static #copyOptional(src,dst) {
    OPTIONAL_PROPS.forEach(prop=>{
      if (src[prop] != null) {
        dst[prop] = src[prop];
      }
    });
  }

  static get EXAMPLE_TEMPLATE() {
    return EXAMPLE_TEMPLATE;
  }

  static create(opts = {}) {
    const msg = 'I6a.create()';
    const dbg = DBG.IDB_SUTTA || DBG.I6A_CREATE;
    let { 
      sutta_uid, 
      lang, 
      author = opts.author_uid,
      title,
      docLang, docAuthor, docAuthorName, docFooter,
      refLang, refAuthor, refAuthorName, refFooter,
      trilingual,
      segments,
    } = opts;

    try {
      IdbSutta.#privateCtor = true;

      if (segments) { // opts is IdbSutta-like
        let idbSutta = {
          sutta_uid, lang, author, title, 
          docLang, docAuthor, docAuthorName, docFooter,
          refLang, refAuthor, refAuthorName, refFooter,
          trilingual, segments,
        };
        IdbSutta.#copyOptional(opts, idbSutta);
        return new IdbSutta(idbSutta);
      } 

      // opts is MlDoc
      let { segMap } = opts;
      if (segMap == null) {
        let msg = `IdbSutta.create() required: segMap or segments`;
        throw new Error(msg);
      }
      let idbSutta = new IdbSutta({
        sutta_uid, lang, author, title, 
        docLang, docAuthor, docAuthorName, docFooter,
        refLang, refAuthor, refAuthorName, refFooter,
        trilingual,
        segments:[],
      });
      let mlDoc = {
        sutta_uid, lang, author_uid:author, title, segMap,
        docLang, docAuthor, docAuthorName, docFooter,
        refLang, refAuthor, refAuthorName, refFooter,
        trilingual,
      };
      idbSutta.merge({mlDoc});
      return idbSutta;
    } finally {
      IdbSutta.#privateCtor = false;
    }
  }

  static idbKey({
    sutta_uid, docLang='en', docAuthor, refLang='en', refAuthor,
  }) {
    const msg = 'I6a.idbKey()';
    const dbg = DBG.I6A_IDB_KEY;

    let idbKey = [
      sutta_uid,
      docLang,
      docAuthor || AuthorsV2.langAuthor(docLang),
      refLang,
      refAuthor || AuthorsV2.langAuthor(refLang),
    ].join('/');

    dbg && console.log(msg, '[1]', idbKey);

    return idbKey;
  }

  static suttaRefToIdbKey(suttaRef, settings={}) {
    const msg = 'I6a.suttaRefToIdbKey()';
    let { docLang = 'en', refLang = 'en', } = settings;
    let {
      docAuthor = AuthorsV2.langAuthor(docLang),
      refAuthor = AuthorsV2.langAuthor(refLang),
    } = settings;
    
    try {
      let { 
        sutta_uid, 
        lang=docLang, 
        author,
      } = SuttaRef.create(suttaRef, docLang);
      if (author == null) {
        author = AuthorsV2.langAuthor(lang);
      }
      if (author == null && docLang === lang) {
        author = docAuthor;
      }
      return IdbSutta.idbKey({
        sutta_uid,
        docLang: lang,
        docAuthor: author,
        refLang,
        refAuthor,
      });
    } catch(e) {
      let emsg = `Invalid sutta reference "${suttaRef}"\n\tin ${msg}`;
      throw new Error(emsg);
    }

  }

  get idbKey() {
    return IdbSutta.idbKey(this);
  }

  // Merge new information from srcNew
  merge(srcNew={}) {
    const msg = 'IdbSutta.merge()';
    const dbg = DBG.IDB_SUTTA || DBG.IDB_SUTTA_MERGE;
    let { 
      mlDoc, 
      refLang:refLangOpts, // WHY?
      highlightExamples=false,
    } = srcNew;
    if (mlDoc == null) {
      let emsg = `${msg} [1]mlDoc?`;
      console.warn(emsg);
      throw new Error(emsg);
    }
    let { segments:dstSegs } = this;
    let dstSegMap = dstSegs.reduce((a,seg) => {
      a[seg.scid] = seg;
      return a;
    }, {});
    let { 
      segMap:srcSegMap,
      sutta_uid, lang, author_uid, 
      title, 
      refLang, refAuthor, refAuthorName, refFooter,
      docLang, docAuthor, docAuthorName, docFooter,
      trilingual,
    } = mlDoc;
    if (srcSegMap == null) {
      let emsg = `${msg} [2]srcSegMap?`;
      console.warn(emsg, {mlDoc});
      throw new Error(emsg);
    }
    this.trilingual = trilingual;
    if (trilingual) {
      if (dbg) {
        let dbgOut = dbg > 1 ? srcNew : {
          sutta_uid,
          docLang,
          docAuthor,
          docAuthorName,
          docFooter,
          refLang,
          refAuthor,
          refAuthorName,
          refFooter,
          title,
        };
        console.log(msg, '[3]trilingual', dbgOut);
      }
      this.author = docAuthor;
      this.lang = docLang;
      this.docAuthor = docAuthor || this.docAuthor;
      this.docAuthorName = docAuthorName || this.docAuthorName;
      this.docLang = docLang || this.docLang;
      this.docFooter = docFooter || this.docFooter;
      this.refLang = refLang || this.refLang || refLang;
      this.refAuthor = refAuthor || this.refAuthor;
      this.refAuthorName = refAuthorName || this.refAuthorName;
      this.refFooter = refFooter || this.refFooter;
    } else {
      if (refLangOpts) {
        dbg && console.warn(msg, '[4]legacy', srcNew);
        this.refAuthor = author_uid;
        this.refLang = refLangOpts;
      } else {
        dbg && console.warn(msg, '[5]legacy', srcNew);
        this.author = author_uid;
        this.lang = lang;
        this.title = title;
      }
    }
    Object.keys(srcSegMap).forEach(scid=>{
      let srcSeg = srcSegMap[scid];
      let dstSeg = dstSegMap[scid];
      if (!dstSeg) {
        dstSeg = {scid:srcSeg.scid};
        dstSegMap[scid] = dstSeg;
      }
      if (trilingual || !refLangOpts) {
        if (!srcSeg.matched) {
          delete dstSeg.matched;
        }
        Object.assign(dstSeg, srcSeg);
      } else {
        dstSeg.ref = srcSeg[refLangOpts];
      }
    });
    this.segments = Object.keys(dstSegMap)
      .sort(SuttaCentralId.compareLow)
      .reduce((a,v,i) => {
        a[i] = dstSegMap[v];
        return a;
      }, []);
    if (highlightExamples) {
      dbg && console.log(msg, '[6]highlightExamples');
      this.highlightExamples(srcNew);
    }
  }

  async highlightExamples(opts={}) {
    const msg = 'IdbSutta.highlightExamples() ';
    let { segments } = this;
    let volatile = useVolatileStore();
    let { 
      segment,
      lang=this.lang, 
      template=EXAMPLE_TEMPLATE,
    } = opts;
    let updated = 0;

    let msStart = Date.now();
    if (segment) { // one segment
      let iSeg = segments.findIndex(s=>s.scid === segment.scid);
      let langText = segment[lang];
      if (RE_EXAMPLE_CLASS.test(langText)) {
        // already highlighted examples
      } else if (langText) {
        let langText2 = Examples.replaceAll(langText, template, lang);
        if (langText2 === langText) {
          // no examples to highlight
        } else {
          segment[lang] = langText2;
          updated = 1;
        }
      }
    } else { // all segments
      volatile.waitBegin('ebt.addingExamples', volatile.ICON_PROCESSING);
      segments.forEach(seg => {
        let langText = seg[lang];
        if (langText && Examples.test(langText, lang)) {
          seg[lang] = Examples.replaceAll(langText, template, lang);
          updated++;
        }
      });
      volatile.waitEnd();
    }
    let msElapsed = Date.now() - msStart;
    //console.log(msg, {updated, segment, msElapsed});

    return updated;
  }

}
