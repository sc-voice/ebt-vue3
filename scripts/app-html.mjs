import { default as Channel } from './channel.mjs';

import process from 'node:process';
let { argv } = process;
let [ nodePath, shPath, srcDir, dstDir, configPath ] = argv;

const { default:config } = await import(configPath);

try {
  Channel.buildRoot({
    srcDir, 
    dstDir, 
    config,
  });
} catch (e) {
  console.warn(e);
  exit -1;
}
