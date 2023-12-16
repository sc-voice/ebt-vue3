
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

  static elementInViewport(elt, root = document.documentElement) {
    const rect = elt?.getBoundingClientRect();
    const { window } = globalThis;
    if (window == null) {
      return false;
    }
    const viewBottom = (window.innerHeight || root.clientHeight);
    const viewRight = (window.innerWidth || root.clientWidth);

    if (!rect) {
      return false;
    }
    if (rect.bottom < 0) {
      return false;
    }
    if (rect.right < 0) {
      return false;
    }
    if (rect.top > viewBottom/2) { // show in top half of viewport
      return false;
    }
    if (rect.left > viewRight) {
      return false;
    }

    return true;
  }

}
