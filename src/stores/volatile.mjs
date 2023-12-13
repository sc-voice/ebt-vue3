import { defineStore } from 'pinia'
import { SuttaRef } from "scv-esm/main.mjs";
import { default as EbtCard } from "../ebt-card.mjs";
import { logger } from "log-instance/index.mjs";
import { ref, nextTick } from "vue";
import { useSettingsStore } from "./settings.mjs";
import {
  DBG_WIKI,
  DBG_SCROLL,
  DBG_HOME,
  DBG_FOCUS,
  DBG_CLICK,
  DBG_ROUTE,
  DBG_LOG_HTML,
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
const showLegacyDialog = ref(false);
const logHtml = ref([]);
const console_log = ref(null);
const routeCard = ref(null);
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
  logHtml,
  routeCard,
  updated: false,
  showAlertMsg: ref(false),
  showSettings,
  showWaiting: ref(false),
  showLegacyDialog,
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
    return INITIAL_STATE;
  },
  getters: {
    iconProcessing() {
      return ICON_PROCESSING;
    },
    iconLoading() {
      return ICON_LOADING;
    },
    audioCard() {
      return routeCard.value?.context === EbtCard.CONTEXT_SUTTA 
        ? routeCard.value 
        : null;
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
    enableLog(on) {
      const msg = "volatile.enableLog()";
      const dbg = DBG_LOG_HTML;
      if (on) {
        if (console_log.value == null) {
          console_log.value = console.log; // save true console.log
          let conLog = function(...args) {
            let line = Utils.logLine(...args);
            console_log.value(line);
            let lines = logHtml.value;
            let lastLine = lines[lines.length-1];
            if (lines.length && lastLine.line === line) {
              lastLine.count++;
            } else {
              logHtml.value.push({count:1, line});
            }
          }
          dbg && conLog(msg, 'enabled');
          console.log = conLog;
        }
      }
    },
    focusElement(element) {
      const msg = 'volatile.focusElement()';
      const dbg = DBG_FOCUS;
      dbg && console.log(msg, {element});
      element.focus();
    },
    setRouteCard(card) {
      const msg = 'volatile.setRouteCard()';
      const dbg = DBG_ROUTE;
      let settings = useSettingsStore();
      dbg && console.log(msg, card.debugString);
      routeCard.value = card;
      settings.routeCardId = card.id;
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
      const dbg = DBG_ROUTE || DBG_SCROLL;
      let { config, } = this;
      let settings = useSettingsStore();
      if (!cardOrRoute) {
        let homePath = settings.homePath(config);
        dbg && console.log(msg, `[1]`, {homePath});
        cardOrRoute = homePath;
      }
      if (!cardOrRoute) {
        let emsg = `${msg} [2]ERROR: cardOrRoute is required`;
        console.log(emsg);
        throw new Error(emsg);
      }
      let isCard = !(typeof cardOrRoute === 'string');
      let route = isCard ? cardOrRoute.routeHash() : cardOrRoute;
      let card = isCard ? cardOrRoute : settings.pathToCard(route);
      if (card == null) {
        dbg && console.log(msg, '[1]no card', {route});
        return;
      }
      let { visible } = card;

      const { window } = globalThis;
      if (window == null) {
        let emsg = `${msg} [3]window?`;
        console.log(emsg);
        throw new Error(emsg);
      } 

      if (window.location.hash === route) {
        if (card.isOpen) {
          switch (card.context) {
            case 'wiki':
              // dbg && console.log(msg, "[4]n/a", card.debugString);
              break;
            case 'search':
            case 'sutta':
              dbg && console.log(msg, "[5]scrollToCard", 
                card.debugString);
              settings.scrollToCard(card);
              break;
          }
        }
      } else if (window.location.hash !== route) {
        let { document } = globalThis;
        let activeElement = document?.activeElement;
        this.debugText += `${msg}-${caller}-${route}`;
        dbg && console.log(msg, "[6]route", route);
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

      if (routeCard.value !== card) {
        dbg && console.log(msg, '[8]setRouteCard', card.debugString,
            {visible});
        this.setRouteCard(card);
        if (!visible) {
          settings.scrollToCard(card);
        }
      }
      return card;
    },
    async fetchText(href) {
      const msg = "volatile.fetchText() ";
      const dbg = DBG_WIKI;
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
    async updateWikiRoute(opts={}) {
      const msg = 'volatile.updateWikiRoute()';
      const dbg = DBG_ROUTE;
      let { card, path } = opts;
      let settings = useSettingsStore();
      try {
        let html = await this.fetchWikiHtml(card);
        if (html && settings.tutorialState(false) && !card.isOpen) {
          card.open(true);
          dbg && console.log(msg, `[1]opened card`, card.debugString);
        }
      } catch(e) {
        dbg && console.log(msg, `[5]invalid`, 
          card.location.join('/'), e);
        card.location = settings.homePath();
      }
    },
    async fetchWikiHtml(card) {
      const msg = 'volatile.fetchWikiHtml() ';
      const dbg = DBG_WIKI || DBG_HOME;
      let { location } = card;
      let { config } = this;
      let settings = useSettingsStore();
      let homePath = settings.homePath(config);
      let windowPath = window?.location?.hash;
      let loc = location.join('/');
      dbg && console.log(msg, '[1]', {
        homePath, windowPath, loc});

      let html = '';
      let locs = [loc];
      if (windowPath.match(`#/${EbtCard.CONTEXT_WIKI}`)) {
        let winLoc = windowPath.split('/').slice(2).join('/');
        if (winLoc !== loc) {
          locs = [winLoc, loc];
        }
      }
      let hrefs = locs.map(p => this.contentPath(p));
      dbg && console.log(msg, '[2]hrefs', hrefs);
      let hrefMap = hrefs.reduce((a,hr,i) => { 
        a[hr] = i; return a; 
      }, {});
      hrefs = Object.keys(hrefMap); // unique hrefs
      dbg && console.log(msg, '[3]', {hrefs});

      for (let i=0; !html && i < hrefs.length; i++) {
        let href = hrefs[i];
        html = await this.fetchText(href);
      }

      if (!html) { // Can't load wiki html
        let homeLocation = homePath.split('/').slice(2);
        let homeLoc = homeLocation.join('/');
        if (homeLoc !== loc) { // Retry with a known location
          card.location = homeLocation;
          dbg && console.log(msg, '[4]retry', homeLoc);
          return this.fetchWikiHtml(card);
        } 

        // Give up
        let { $t } = this;
        let alertMsg = $t('ebt.cannotLoadWikiHtml');
        console.warn(msg, '[4]', alertMsg, hrefs);
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
      const dbg = DBG_CLICK || DBG_FOCUS;
      let { settings, } = this;
      let { target } = evt || {};
      let { localName, href, hash } = target;
      dbg && console.log(msg, '[1]setRoute', card.debugString, evt);
      this.setRoute(card, undefined, msg);
      if (!card.hasFocus) {
         let elt = document.getElementById(card.tab1Id);
         dbg && console.log(msg, '[2]focusElement', elt);
         this.focusElement(elt);
      }
    },
  },
})
