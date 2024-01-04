import { logger } from 'log-instance/index.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { Examples, SuttaRef, SuttaCentralId } from 'scv-esm/main.mjs';
import {
  DBG_IDB_SUTTA, DBG_VERBOSE,
} from './defines.mjs';
import * as Idb from "idb-keyval";

const OPTIONAL_PROPS = ['saved', 'refAuthor', 'refLang'];
const EXAMPLE_CLASS = 'ebt-example';
const RE_EXAMPLE_CLASS = new RegExp(EXAMPLE_CLASS);
const EXAMPLE_TEMPLATE = `<span class="${EXAMPLE_CLASS}">\$&</span>`;

const msg = 'IdbSuttas.';

export default class IdbSutta {
  static #privateCtor;

  constructor(opts = {}) {
    if (!IdbSutta.#privateCtor) {
      throw new Error("use IdbSutta.create()");
    }

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
    const msg = 'IdbSutta.create()';
    const dbg = DBG_IDB_SUTTA;
    let { 
      sutta_uid, 
      lang, 
      author = opts.author_uid,
      title,
      docLang,
      docAuthor,
      refLang,
      refAuthor,
      trilingual,
      segments,
    } = opts;
    dbg && console.log(msg, opts);

    try {
      IdbSutta.#privateCtor = true;

      if (segments) { // opts is IdbSutta-like
        let idbSutta = {
          sutta_uid, lang, author, title, 
          docLang, docAuthor, refLang, refAuthor, trilingual,
          segments,
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
        docLang, docAuthor, refLang, refAuthor, trilingual,
        segments:[],
      });
      let mlDoc = {
        sutta_uid, lang, author_uid:author, title, segMap,
        docLang, docAuthor, refLang, refAuthor, trilingual,
      };
      idbSutta.merge({mlDoc});
      return idbSutta;
    } finally {
      IdbSutta.#privateCtor = false;
    }
  }

  static idbKey(suttaRef) {
    const msg = 'IdbSutta.idbKey()';
    const dbg = DBG_IDB_SUTTA;
    const dbgv = DBG_VERBOSE && dbg;

    let sref = SuttaRef.create(suttaRef);
    if (sref == null) {
      let emsg = `${msg} invalid suttaRef:${JSON.stringify(suttaRef)}`;
      let e = new Error(emsg);
      throw e;
    }
    let { sutta_uid, lang, author } = sref;
    let idbKey = `/sutta/${sutta_uid}/${lang}/${author}`;

    if (author == null) {
      dbg && console.warn(msg, '[1]author?', suttaRef, idbKey);
    } else {
      dbgv && console.log(msg, '[2]ok', suttaRef, idbKey);
    }

    return idbKey;
  }

  get idbKey() {
    let { sutta_uid, lang, author } = this;
    return IdbSutta.idbKey({ sutta_uid, lang, author });
  }

  merge(opts={}) {
    const msg = 'IdbSutta.merge()';
    const dbg = DBG_IDB_SUTTA;
    let { mlDoc, refLang:refLangOpts, highlightExamples=false } = opts;
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
      lang, author_uid, title, segMap:srcSegMap,
      refLang, refAuthor, docLang, docAuthor, trilingual,
    } = mlDoc;
    if (srcSegMap == null) {
      let emsg = `${msg} [2]srcSegMap?`;
      console.warn(emsg, {mlDoc});
      throw new Error(emsg);
    }
    this.trilingual = trilingual;
    if (trilingual) {
      dbg && console.log(msg, '[3]trilingual', opts);
      this.author = docAuthor;
      this.lang = docLang;
      this.docAuthor = docAuthor;
      this.docLang = docLang;
      this.refLang = refLang;
      this.refAuthor = refAuthor;
    } else {
      if (refLangOpts) {
        dbg && console.warn(msg, '[4]legacy', opts);
        this.refAuthor = author_uid;
        this.refLang = refLangOpts;
      } else {
        dbg && console.warn(msg, '[5]legacy', opts);
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
      this.highlightExamples(opts);
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
