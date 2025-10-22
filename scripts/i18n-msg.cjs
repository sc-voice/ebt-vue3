#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const I18NDIR = path.join(__dirname, '../src/i18n');

let args = process.argv;
let [nodePath, progPath, keyPath, value] = args;
let script = path.basename(progPath);

if (keyPath == null) {
  console.log("Expected:");
  console.log(`  ${script} KEYPATH VALUE`);
  process.exit();
  throw new Error("ERROR");
}
if (keyPath.indexOf('.') < 0) {
  keyPath = `ebt.${keyPath}`;
}
let [groupKey, key, ...extraKeys] = keyPath.split('.');
if (extraKeys.length) {
  throw new Error(`unsupported key ${keyPath}`);
}
if (key == null) {
  key = groupKey;
  groupKey = 'ebt';
}
console.log({ key, keyPath, groupKey });

let WRITE = 1;

(async () => {
  let [...files] = await fs.promises.readdir(I18NDIR);
  for (f of files) {
    let fpath = path.join(I18NDIR, f);
    let srcJson = await import(fpath)
    let dstJson = JSON.parse(JSON.stringify(srcJson.default));
    let groupObj = dstJson[groupKey];
    if (!groupObj) {
      groupObj = dstJson[groupKey] = {};
    }

    if (value === "DELETE") {
      delete groupObj[key];
      let ts = 'export default ' + JSON.stringify(dstJson, null, 2);
      WRITE && await fs.promises.writeFile(fpath, ts);
      console.log(`FILE: ${fpath} ${keyPath}: (deleted)`);
    } else if (value != null) {
      groupObj[key] = value;
      let groupKeys = Object.keys(groupObj).sort();
      let groupSorted = groupKeys.reduce((a, k, i) => {
        a[k] = groupObj[k];
        return a;
      }, {});
      dstJson[groupKey] = groupSorted;
      console.log('keys',
        Object.keys(groupObj).length,
        Object.keys(groupSorted).length,
        groupKeys.length);
      let ts = 'export default ' + JSON.stringify(dstJson, null, 2);
      WRITE && await fs.promises.writeFile(fpath, ts);
      console.log(`FILE: ${fpath} => ${keyPath}: "${groupObj[key]}"`);
    } else {
      let value = groupObj[key] == null ? "undefined" : `"${groupObj[key]}"`;
      console.log(`FILE: ${fpath} ${keyPath}: ${value}`);
    }
  }
})()

