import { AuthorsV2 } from 'scv-esm/main.mjs';
import { 
  DBG_VERBOSE, DBG_D3, 
} from './defines.mjs';


var allowCtor = false;

export default class EbtD3 {
  constructor(opts = {}) {
    let msg = 'ebt-d3.ctor() ';
    let dbg = DBG_D3;
    if (!allowCtor) {
      let emsg = `${msg}create() is required`;
      throw new Error(emsg);
    }

    let {
      lang='en',
      author,
      graph,
    } = opts;
    author = author || AuthorsV2.langAuthor(lang);
    let graphUrl = [
      'https://raw.githubusercontent.com/sc-voice/scv-bilara',
      'main/src/assets',
      `esd3-${lang}-${author}.json`
    ].join('/');

    Object.assign(this, {
      lang, 
      author,
      graph,
      graphUrl,
    });
  }

  static async create(opts={}) {
    let ed3;
    try {
      allowCtor = true;
      ed3 = new EbtD3(opts);
    } finally {
      allowCtor = false;
    }
    let { graph } = ed3;
    if (graph == null) {
      let res = await fetch(ed3.graphUrl);
      graph = await res.json();
    }

    ed3.graph = graph;
    return ed3;
  }

  traverseLinks(srcIdMap) {
    const msg = 'EbtD3.traverseLinks()';
    const dbg = DBG_D3;
    let { graph } = this;
    let dstIdMap = graph.links.reduce((a,link)=>{
      if (srcIdMap[link.source]) {
        a[link.target] = true;
      } 
      if (srcIdMap[link.target]) {
        a[link.source] = true;
      } 
      return a;
    }, {});
    return dstIdMap;
  }

  slice(opts={}) {
    const msg = 'EbtD3.slice()';
    const dbg = DBG_D3;
    const dbgv = DBG_VERBOSE && dbg;
    let { graph } = this;
    let { nodeMatch, idPat, depth=1 } = opts;
    if (nodeMatch == null) {
      nodeMatch = idPat instanceof RegExp
        ? (n=>idPat.test(n.id))
        : (n=>n.id === idPat);
    }
    let nodeCount = 0;
    let idMap = graph.nodes.reduce((a,n)=>{
      let { id } = n; 
      if (nodeMatch(n)) {
        a[id] = true;
        nodeCount++;
      }
      return a;
    }, {});
    let linkMap = Object.assign({},idMap);
    for (let i=1; i<=depth; i++) {
      dbgv && console.log(msg, `[1]traverseLinks@${i}/${depth}`, idMap);
      linkMap = this.traverseLinks(linkMap);
      Object.assign(idMap, linkMap);
    }
    dbgv && console.log(msg, `[2]idMap`, idMap);

    let nodes;
    if (nodeCount === 0) {
      nodes = [{ id: idPat, }];
      dbg && console.log(msg, '[3]empty', nodes);
    } else {
      nodes = graph.nodes.filter(n=>idMap[n.id]);
    }
    let links = graph.links
      .filter(l=> idMap[l.source] && idMap[l.target]);

    return {nodes, links}
  }

}
