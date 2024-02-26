#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import { default as EN } from "../src/i18n/es.mjs"
import {
  DeepLAdapter,
} from "ebt-deepl";

let [nodePath, scriptPath, ...args] = process.argv; 
let script = path.basename(scriptPath);
const msg = `${script}`;

const srcLang = 'en';
let [ dstLang ] = args;
if (dstLang == null) {
  console.log(msg, "[1] Expected destination language code");
  process.exit(-1);
}


(async()=>{
  let dlt = await DeepLAdapter.create({srcLang, dstLang});

  async function translate(src, dst={}) {
    const msg = `${script}.translate()`;
    let keys = Object.keys(src);
    for (let i=0; i<keys.length; i++) {
      let key = keys[i];
      let srcVal = src[key];
      if (typeof srcVal === 'object') {
        console.warn(msg, '[2]object', key);
        dst[key] = await translate(srcVal);
      } else {
        let trans = await dlt.translate([srcVal]);
        console.warn(msg, '[3]translate', key, trans);
        dst[key] = trans[0];
      }
    }
    return dst;
  }

  let xlt = await translate(EN);
  console.log(JSON.stringify(xlt, null, 2));
})();
