import fs from 'fs';
const { promises: fsp } = fs;
import path from 'path';
import { logger } from 'log-instance/index.mjs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { default as MarkdownItRenderer } from './markdown-it-renderer.mjs';
import { default as EbtMarkdown } from '../src/ebt-markdown.mjs';
import { default as EbtCard } from '../src/ebt-card.mjs';
import { default as EbtConfig } from '../ebt-config.mjs';
const SRCDIR = path.join(__dirname, '../content');
const DSTDIR = path.join(__dirname, '../public/content');

export default class Channel {
  constructor(opts={}) {
    const msg = 'Channel.ctor() ';

    let { 
      srcDir,
      dstDir,
      config,
      htmlHead = EbtMarkdown.HTML_HEAD,
      htmlTail = EbtMarkdown.HTML_TAIL,
      //renderer = new CmarkGfmRenderer(), // no footnotes
      renderer = new MarkdownItRenderer(),
      wikiPath = EbtConfig.homePath,
    } = opts;

    // Required
    if (!fs.existsSync(srcDir)) {
      throw new Error(`${msg} srcDir not found: ${srcDir}`);
    }
    if (!fs.existsSync(dstDir)) {
      throw new Error(`${msg} dstDir not found: ${dstDir}`);
    }
    if (!config) {
      throw new Error(`${msg} config is required`);
    }

    let { content, basePath } = config;
    let indexSrcFile = `${content?.index}.md`;

    Object.assign(this, {
      srcDir,
      dstDir,
      config,
      renderer,
      htmlHead,
      htmlTail,
      renderer,
      indexSrcFile,
      basePath,
    });
  }
  
  async #convertMarkDownFile(fnSrc, fnDst, ) {
    const msg = 'Channel.convertMarkDownFile() ';
    let { 
      config, renderer, categories, srcDir, htmlHead, htmlTail, basePath 
    } = this;
    let markdown = fs.readFileSync(fnSrc).toString();
    let location = fnSrc
      .replace(srcDir,'')
      .replace(/\.md$/,'')
      .replace(/\.html$/,'')
      .split('/')
      .slice(1);
    let wikiPath = [ EbtCard.CONTEXT_WIKI, ...location, ].join('/');
    //console.log(msg, {srcDir, basePath, fnSrc, fnDst, wikiPath});
    let emd = new EbtMarkdown({
      config, basePath, wikiPath, renderer, htmlHead, htmlTail});
    let { metadata, htmlLines }  = await emd.render(markdown);

    let html = htmlLines.join('\n');
    await fsp.writeFile(fnDst, html);

    let catKey = fnSrc.replace(srcDir, '');
    categories[catKey] = categories[catKey] || [];
    categories[catKey].push(metadata);

    logger.debug(msg, catKey, fnDst);
    return {
      metadata,
    }
  }

  async #buildChannelIndex(channel) {
    const msg = 'Channel.buildChannelIndex() ';
    let { htmlHead, htmlTail, config, indexSrcFile } = this;
    let { basePath, content } = config;
    let { name, kids, fnDst, fnSrc } = channel;
    kids.sort((a,b)=>EbtMarkdown.compareMetadata(a.metadata, b.metadata));
    let index = content.index;
    let indexDst = path.join(fnDst, `${index}.html`);
    //let indexSrcFile = `${index}.md`;
    let indexSrc = path.join(fnSrc, indexSrcFile);
    let htmlBody;
    if (fs.existsSync(indexSrc)) {
      let htmlBuf = await fsp.readFile(indexDst);
      htmlBody = htmlBuf.toString().split('\n');
      htmlHead && htmlBody.shift();
      htmlTail && htmlBody.pop();
    } else {
      let emd = new EbtMarkdown({config, htmlHead, htmlTail});
      htmlBody = [];
    }
    let lastCategory = "lastCategory";
    let htmlKids = kids.reduce((a,kid,i)=>{
      if (kid.metadata == null) {
        console.log('channel.mjs@112: kid?', kid);
        return a;
      }
      let { 
        title, 
        img, 
        detail=[], 
        description, 
        category="",
      } = kid.metadata;
      if (kid.name === indexSrcFile) {
        //console.log(msg, "skipping", kid);
        return a; // omit custom index file from index
      }
      console.log(msg, `[1]${name} "${category}"`, kid.name);
      let imgSrc = img.startsWith('http') 
        ? img.replace(' //', '//') 
        : `${basePath}img/${img}`
      let home = EbtCard.CONTEXT_WIKI;
      //console.log(msg, imgSrc);
      let tocHref = name === 'main'
      ? `${basePath}#/${home}/${kid.name}`.replace('.md', '')
      : `${basePath}#/${home}/${name}/${kid.name}`.replace('.md', '');
      if (lastCategory !== category) {
        a.push(`  <h3 class="ebt-toc-category">${category}</h3>`);
        lastCategory = category;
      }
      a.push(`  <div class="ebt-toc-item">`);
      a.push(`   <a href="${tocHref}" tabindex=-1 >`);
      a.push(`    <div class="ebt-thumbnail"><img src="${imgSrc}" /></div>`);
      a.push(`   </a>`);
      a.push(`   <div class="ebt-toc-item-text">`);
      a.push(`    <a href="${tocHref}">`);
      a.push(`      <div class="ebt-toc-item-title">${title}</div>`);
      a.push(`    </a>`);
      if (detail.length) {
        a.push(`     <details class="ebt-toc-detail" open>`);
        a.push(`       <summary>${description}</summary>`);
        a.push(`       <ul>`);
        detail.forEach(detail=>{
          a.push(`        <li>${detail}</li>`);
        });
        a.push(`       </ul>`);
        a.push(`     </details>`);
      } else {
        a.push(`     <div class="ebt-toc-item-description">${description}</div>`);
      }
      a.push(`    </div>`);
      a.push(`  </div><!--ebt-toc-item-->`);
      return a;
    }, []);
    htmlKids.unshift(` <div class="ebt-toc"><!--ebt-toc/${name}-->`);
    htmlKids.push(` </div><!--ebt-toc/${name}-->`);
    //console.log(msg, 'kids', kids.length, htmlKids.length);
    let html = [
      htmlHead,
      ...htmlBody,
      ...htmlKids, htmlTail,
    ].join('\n');
    await fsp.writeFile(indexDst, html);
    logger.info(msg, indexSrc, indexDst);
  }

  async #buildChannelFiles(channel, srcDir) {
    const msg = 'Channel.buildChannelFiles() ';
    let { indexSrcFile } = this;
    const entries = await fsp.readdir(srcDir, {
      recursive: false,
      withFileTypes: true,
    });
    console.log(msg, '[0]readdir', {srcDir, entries});

    for (let i = 0; i < entries.length; i++) {
      let entry = entries[i];
      let { name, } = entry;
      let fnSrc = path.join(srcDir, name);
      let fnDst = fnSrc.replace(this.srcDir, this.dstDir);
      if (entry.isFile()) {
        if (name.endsWith('.md')) {
          fnDst = fnDst.replace(/.md$/, '.html');
          logger.info(msg, `[1]Channel ${channel.name}/${name}`, 
            {fnSrc, fnDst});
          let rescmd = await this.#convertMarkDownFile(fnSrc, fnDst);
          let { metadata }  = rescmd;
          let kid = { name, fnSrc, fnDst, metadata };
          channel.kids.push(kid);
        } else {
          logger.warn(msg, '[2]FILE ignored', {name, fnsSrc});
        }
      } else if (entry.isDirectory()) {
        let kid = { name, fnSrc, fnDst};
        let kidChannel = await this.#buildChannel(name, fnSrc);
        let kidIndex = kidChannel.kids.find(k => k.name === indexSrcFile);
        if (kidIndex) {
          kidIndex = Object.assign({}, kidIndex);
          kidIndex.name = `${name}/${kidIndex.name}`;
          channel.kids.push(kidIndex);
          logger.info(msg, `[3]built channel ${channel.name}/${name}`, );
        } else {
          logger.info(msg, `[4]built hidden channel`,
            `${channel.name}/${name}`);
        }
      } else {
        logger.warn(msg, '[5]IGNORING CHANNEL ENTRY', 
          {channel, name, fnSrc});
      }
    }
  }

  async #buildChannel(name, fnSrc) {
    const msg = 'Channel.buildChannel() ';
    let fnDst = fnSrc.replace(this.srcDir, this.dstDir);
    let channel = {name, fnSrc, fnDst, kids:[]};

    logger.info(msg, '[1]', channel);
    await fsp.mkdir(fnDst, {recursive: true});
    await this.#buildChannelFiles(channel, fnSrc);
    await this.#buildChannelIndex(channel, fnSrc);
    logger.info(msg, '[2]', channel);

    return channel;
  }

  async build() {
    const msg = 'Channel.build() ';
    let { srcDir, dstDir } = this;
    await fsp.mkdir(dstDir, {recursive:true});
    this.categories = {};
    try {
      await this.#buildChannel('main', srcDir);
    } catch(e) {
      logger.warn(msg, e);
      throw e;
    }
  }

  static async buildRoot(opts={}) {
    const msg = 'Channel.buildRoot() ';
    logger.info(msg, opts);
    let channel = new Channel(opts);
    channel.build();
  }

}
