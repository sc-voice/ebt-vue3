#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import { default as EN } from "../src/i18n/en.mjs"
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

let outPath = path.join(scriptPath, '../../src/i18n', `${dstLang}.mjs`);

(async()=>{
  let dlt = await DeepLAdapter.create({srcLang, dstLang});

  async function translate(src, dst={}) {
    const msg = `${script}.translate()`;
    let keys = Object.keys(src);
    for (let i=0; i<keys.length; i++) {
      let key = keys[i];
      let srcVal = src[key];
      if (key === 'languageCode') {
        switch (dstLang) {
          case 'it':
            dst[key] = "Italiano / IT";
            break;
          case 'pt':
            dst[key] = "Português / PT";
            break;
          case 'es':
            dst[key] = "Español / ES";
            break;
          case 'ru':
            dst[key] = "Русский / RU";
            break;
        }
      } else if (typeof srcVal === 'object') {
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
  console.warn(msg, '[4]writing', outPath);

  let json = JSON.stringify(xlt, null, 2);
  let js = 'export default ' + json;
  await fs.promises.writeFile(outPath, js);
  console.warn(msg, '[5]done');
})();
