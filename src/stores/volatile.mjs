import { defineStore } from 'pinia'
import { SuttaRef } from "scv-esm/main.mjs";
import { default as EbtCard } from "../ebt-card.mjs";
import { logger } from "log-instance/index.mjs";
import { ref, nextTick } from "vue";
import { useSettingsStore } from "./settings.mjs";
import {
  DEBUG_WIKI,
  DEBUG_HOME,
  DEBUG_FOCUS,
  DEBUG_CLICK,
  DEBUG_ROUTE,
} from "../defines.mjs";
import Utils from "../utils.mjs";
import * as Idb from "idb-keyval";

const suttas = new Map();
const displayBox = ref();
const showSettings = ref(false);
const homeHtml = ref('loading...');
const SAMPLE_RATE = 48000;
const ICON_DOWNLOAD = 'mdi-wan';
const ICON_PROCESSING = 'mdi-factory';
const INITIAL_STATE = {
  $t: t=>t,
  alertHtml: ref("hello<br>there"),
  alertMsg: ref(null),
  btnSettings: ref(undefined),
  collapseAppBar: ref(false),
  config: ref(undefined),
  debugText: ref('debugText:'),
  delayedWaiting: 0,
  ebtChips: ref(undefined),
  homeHtml,
  routeCard: undefined,
  updated: false,
  showAlertMsg: ref(false),
  showSettings,
  showWaiting: ref(false),
  showLegacyDialog: ref(false),
  suttas,
  touchSwipe: ref('waiting...'),
  trilingual: ref(true),
  waiting: 0,
  waitingDelay: ref(500),
  waitingIcon: ref(ICON_DOWNLOAD),
  waitingMsg: ref('...'),

};

export const useVolatileStore = defineStore('volatile', {
  state: () => {
    let s = Object.assign({}, INITIAL_STATE);
    //console.log('volatile.state()', s);
    return s;
  },
  getters: {
    iconProcessing() {
      return ICON_PROCESSING;
    },
    iconLoading() {
      return ICON_LOADING;
    },
    audioCard() {
      let { routeCard } = this;
      return routeCard?.context === EbtCard.CONTEXT_SUTTA 
        ? routeCard : null;
    },
    displayBox() {
      let root = document?.documentElement;
      if (root) {
        let onresize = ()=>{
          displayBox.value = {
            w: root.clientWidth,
            h: root.clientHeight,
          }
        }
        if (displayBox.value == null) {
          document.defaultView.onresize = onresize;
          onresize();
        }
      } else {
        displayBox.value = {
          w:  375,
          h: 667,
        }
      }
      return displayBox;
    },
  },
  actions: {
    focusElement(element) {
      const msg = 'volatile.focusElement()';
      const dbg = DEBUG_FOCUS;
      dbg && console.log(msg, {element});
      element.focus();
    },
    setRouteCard(card) {
      const msg = 'volatile.setRouteCard()';
      const dbg = DEBUG_ROUTE;
      dbg && console.log(msg, `${card.id} ${card.context}`);
      this.routeCard = card;
    },
    trilingualPattern(search) {
      const msg = 'volatile.trilingualPattern() ';
      let settings = useSettingsStore();
      let { trilingual } = this;
      let { refAuthor, refLang, docAuthor, docLang, } = settings;
      let pattern = search && search.toLowerCase().trim();
      if (trilingual) {
        pattern = [
          pattern,
          `-dl ${docLang}`,
          `-da ${docAuthor}`,
          `-rl ${refLang}`,
          `-ra ${refAuthor}`,
          `-ml1`,
        ].join(' ');
      }
      return pattern;
    },
    searchUrl(search) {
      let settings = useSettingsStore();
      let pattern = this.trilingualPattern(search);
      let { langTrans, maxResults, } = settings;
      let searchPath = [
        settings.serverUrl,
        'search',
        encodeURIComponent(pattern),
      ].join('/');
      let query=[
        `maxResults=${maxResults}`,
      ].join('&');
      return `${searchPath}/${langTrans}?${query}`
    },
    setRoute(cardOrRoute, keepFocus, caller) {
      const msg = 'volatile.setRoute()';
      let { config, } = this;
      let settings = useSettingsStore();
      let dbg = DEBUG_ROUTE ;
      if (!cardOrRoute) {
        let homePath = settings.homePath(config);
        dbg && console.log(msg, `[1]`, {homePath});
        cardOrRoute = homePath;
      }
      if (!cardOrRoute) {
        console.trace(msg, '[2]ERROR: cardOrRoute is required');
        return;
      }
      let isCard = !(typeof cardOrRoute === 'string');
      let route = isCard ? cardOrRoute.routeHash() : cardOrRoute;
      let card = isCard ? cardOrRoute : settings.pathToCard(route);
      let { visible } = card;

      const { window } = globalThis;
      if (window == null) {
        console.trace(msg, '[3]', 'no window');
      } else if (window.location.hash === route) {
        if (card.isOpen) {
          switch (card.context) {
            case 'wiki':
              dbg && console.log(msg, "[4]same route", card.id, 
                {visible});
              if (!visible) {
                //settings.scrollToCard(card);
              }
              break;
            case 'search':
            case 'sutta':
              dbg && console.log(msg, "[5]same route", card.id);
              settings.scrollToCard(card);
              break;
          }
        }
      } else if (window.location.hash !== route) {
        let { document } = globalThis;
        let activeElement = document?.activeElement;
        this.debugText += `${msg}-${caller}-${route}`;
        dbg && console.log(msg, "[6]different route", {route});
        window.location.hash = route;
        let expected = activeElement;
        let actual = document?.activeElement;
        if (expected !== actual) {
          if (keepFocus) {
            this.focusElement(activeElement); // why?
          } else {
            dbg && console.log(msg, `[7]activeElement`, 
              {expected, actual, route});
          }
        }
      }

      if (this.routeCard !== card) {
        this.routeCard = card;
        dbg && console.log(msg, '[8]routeCard <=', card.id);
      }
      return card;
    },
    async fetchText(href) {
      const msg = "volatile.fetchText() ";
      const dbg = DEBUG_WIKI;
      let res;
      let text;
      try {
        res = await fetch(href);
        if (res.ok) {
          text = await res.text();
          dbg && console.log(msg, '[1]OK', {href, text});
        } else {
          dbg && console.warn(msg, '[2]FAIL', {href, res});
        }
      } catch (e) {
        dbg && console.warn(msg, '[3]ERROR', {href, e});
      }
      return text;
    },
    contentPath(wikiPath) {
      let { config={} } = this;
      wikiPath = wikiPath.replace(/\/?#?\/?wiki\//, '');
      wikiPath = wikiPath.replace(/\/-.*/, '');
      return `${config.basePath}content/${wikiPath}.html`;
    },
    async fetchWikiHtml(location, caller) {
      const msg = 'volatile.fetchWikiHtml() ';
      const dbg = DEBUG_WIKI || DEBUG_HOME;
      let { config } = this;
      let settings = useSettingsStore();
      let homePath = settings.homePath(config);
      let windowHash = window?.location?.hash;
      let locationPath = location.join('/');
      dbg && console.log(msg, {homePath, windowHash, locationPath});

      let html = '';
      let paths = [locationPath];
      if (windowHash.match(`#/${EbtCard.CONTEXT_WIKI}`)) {
        let hashPath = windowHash.split('/').slice(2).join('/');
        if (hashPath !== locationPath) {
          paths = [hashPath, locationPath];
        }
      }
      let hrefs = paths.map(p => this.contentPath(p));
      dbg && console.log(msg, 'hrefs', hrefs);
      let hrefMap = hrefs.reduce((a,hr,i) => { 
        a[hr] = i; return a; 
      }, {});
      hrefs = Object.keys(hrefMap); // unique hrefs
      dbg && console.log(msg, {hrefs});

      for (let i=0; !html && i < hrefs.length; i++) {
        let href = hrefs[i];
        html = await this.fetchText(href);
      }

      if (!html) {
        let { $t } = this;
        let alertMsg = $t('ebt.cannotLoadWikiHtml');
        logger.warn(msg, alertMsg, hrefs);
        html = [
          `<h2>${alertMsg}</h2>`,
          '<pre>',
          ...hrefs,
          '</pre>',
        ].join('\n');
      }

      homeHtml.value = html;
      return html;
    },
    alert(eOrMsg, context, alertHtml="") {
      let msg = eOrMsg;
      if (msg instanceof Error) {
        msg = eOrMsg.message;
        console.warn('volatile.alert()', eOrMsg);
      }
      msg && console.trace(`volatile.alert() ${msg} ${context}`);
      this.alertMsg = msg && { msg, context };
      this.alertHtml = alertHtml;
      this.showAlertMsg = !!msg;
    },
    waitBegin(msgKey, icon=ICON_DOWNLOAD, context='') {
      let { $t } = this;
      msgKey && (this.waitingMsg = $t(msgKey));
      this.waitingIcon = icon;
      this.waitingContext = context;
      if (this.waiting === 0) {
        setTimeout(()=>{
          if (this.waiting > 0) {
            this.showWaiting = true;
          }
        }, this.waitingDelay);
      }
      this.waiting++;
    },
    waitEnd() {
      this.waiting--;
      if (this.waiting <= 0) {
        this.showWaiting = false;
      }
    },
    addMlDoc(mld) {
      let { sutta_uid, lang, author_uid:author } = mld || {};
      let suttaRef = SuttaRef.create({sutta_uid, lang, author});
      let key = suttaRef.toString();
      logger.debug("volatile.addMlDoc", {key, mld});
      suttas[key] = mld;
    },
    mlDocFromSuttaRef(suttaRefArg) {
      let suttaRef = SuttaRef.create(suttaRefArg);
      let key = suttaRef.toString();
      return suttas[key];
    },
    async fetch(url, options={}) {
      const msg = `volatile.fetch() ${url} `;
      let res;
      try {
        this.waitBegin();
        logger.debug(msg);
        let fetchOpts = Object.assign({
    //      mode: 'no-cors',
        }, options);
        res = await fetch(url, fetchOpts);
        logger.debug(msg,  res);
      } catch(e) {
        logger.error(msg + "ERROR:", res, e);
        res = { error: `ERROR: ${url.value} ${e.message}` };
      } finally {
        this.waitEnd();
      }
      return res;
    },
    async fetchJson(url, options) {
      try {
        let res = await this.fetch(url, options);;
        return res.ok ? await res.json() : res;
      } catch(e) {
        logger.error("volatile.fetchJson() ERROR:", res, e);
        res = { error: `ERROR: ${url.value} ${e.message}` };
      }
      return res;
    },
    onClickCard(evt, card) {
      const msg = "volatile.onClickCard() ";
      let { settings, } = this;
      let { target } = evt || {};
      let { localName, href, hash } = target;
      let dbg = DEBUG_CLICK;
      dbg && console.log(msg, 'setRoute', card.id, evt);
      this.setRoute(card, undefined, msg);
    },
  },
})
