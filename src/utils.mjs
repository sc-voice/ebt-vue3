import {
  DBG_VIEWPORT, DBG_VERBOSE, DBG_KEY,
  APP_BAR_H,
} from './defines.mjs';

export default class Utils {
  static assignTyped(dst, initial, src=initial) {
    let keys = Object.keys(initial);
    keys.forEach(k=>{
      let value = src[k];
      if (value !== undefined) {
        let type = typeof initial[k];
        if (type === 'number') {
          dst[k] = Number(value);
        } else if (initial[k] instanceof Date) {
          dst[k] = new Date(value);
        } else if (type === 'boolean') {
          dst[k] = `${value}` !== 'false' && value != null;
        } else if (initial[k] instanceof Array) {
          dst[k] = [...value];
        } else {
          dst[k] = `${value}`;
        }
      }
    });
    return dst;
  }

  static logLine(...args) {
    let line = [];

    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      let text = `${arg}`;

      if (text === '[object Object]') {
        try {
          text = JSON.stringify(arg);
        } catch (e) {
          text = `![${e.message}]`;
        }
      }
      line.push(text);
    }

    return line.join(' ');
  }

  static elementInViewport(elt, opts={}) {
    const msg = "Utils.elementInViewport()";
    const dbg = DBG_VIEWPORT;
    const dbgv = dbg && DBG_VERBOSE;
    const { 
      root = document.documentElement,
      zone = 80,
    } = opts;
    const rect = elt?.getBoundingClientRect();
    const { window } = globalThis;
    if (window == null) {
      dbgv && console.log(msg, '[1]!window');
      return false;
    }
    const viewBottom = (window.innerHeight || root.clientHeight);
    const viewRight = (window.innerWidth || root.clientWidth);

    if (!rect) {
      dbg && console.log(msg, '[2]!rect');
      return false;
    }
    if (rect.bottom < 0) {
      dbg && console.log(msg, '[3]!bottom');
      return false;
    }
    if (rect.right < 0) {
      dbg && console.log(msg, '[4]!right');
      return false;
    }
    if (rect.top > viewBottom*zone/100 - APP_BAR_H) {
      dbg && console.log(msg, `[5]!top${zone}`);
      return false;
    }
    if (rect.left > viewRight) {
      dbg && console.log(msg, '[6]!left');
      return false;
    }

    dbgv && console.log(msg, '[7]in view');
    return true;
  }

  static async updateClipboard(newClip) {
    let msg = 'Utils.updateClipboard()';
    let dbg = DBG_KEY;
    try {
      await navigator.clipboard.writeText(newClip);
      dbg && console.log(msg, '[1]copied', newClip);
    } catch (e) {
      console.warn(msg, '[2]failed', e);
    }
  }
                                  

}
