import { nextTick } from "vue";
import { defineStore } from 'pinia';
import { logger } from 'log-instance/index.mjs';
import Utils from "../utils.mjs";
import { SuttaRef, AuthorsV2 } from 'scv-esm/main.mjs';
import { default as EbtSettings } from "../ebt-settings.mjs";
import { default as EbtCard } from "../ebt-card.mjs";
import { 
  DEBUG_OPEN_CARD, DEBUG_ADD_CARD, DEBUG_HOME, DEBUG_SETTINGS, 
  DEBUG_SCROLL, DEBUG_FOCUS 
} from '../defines.mjs';
import * as Idb from "idb-keyval"; 

const SETTINGS_KEY = "settings";

var id = 1;

function elementInViewport(elt, root = document.documentElement) {
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

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const msg = 'settings.useSettingsStore() ';
    let settings = Utils.assignTyped({loaded:false}, EbtSettings.INITIAL_STATE);
    return settings;
  },
  actions: {
    authors(lang) {
      const MAXNAMES = 3;
      let { docLang, showSutta, showVinaya } = this;
      let authors = AuthorsV2.find({
        lang,
        sutta: showSutta,
        vinaya: showVinaya,
      }).map(info=>({
        value: info.author,
        title: info.name.join(', '),
      }));
      return authors;
    },
    async loadSettings(config) {
      let msg = 'settings.loadSettings() ';
      let dbg = DEBUG_ADD_CARD;
      if (this.loaded) {
        return this;
      }
      let state = Utils.assignTyped({}, EbtSettings.INITIAL_STATE);
      let savedState = await Idb.get(SETTINGS_KEY);
      if (savedState) {
        try {
          let { cards, logLevel } = savedState;
          logger.logLevel = logLevel;
          if (cards == null) {
            cards = savedState.cards = [{context:'home'}];
          }
          cards.forEach((card,i) => {
            dbg && console.log(msg, '[1]loaded', card.context, card.id);
            cards[i] = new EbtCard(card);
          });
          
          let pathCard = EbtCard.pathToCard({ 
            path: window.location.hash,  // update card if necessary
            cards, 
            addCard: null,
            defaultLang: this.langTrans,
          });
          //console.log(msg, {pathCard});
        } catch(e) {
          logger.warn(msg,  savedState, e.message);
          savedState = null;
        }
      }
      if (savedState) {
        Utils.assignTyped(this, EbtSettings.INITIAL_STATE, savedState);
      }
      if (config?.monolingual) {
        this.langTrans = config.monolingual;
        this.locale = config.monolingual;
        EbtSettings.validate(this);
      }
      //logger.info(msg, 'loaded');
      this.loaded = true;
      return this;
    },
    pathToCard(fullPath) {
      const msg = `settings.pathToCard(${fullPath}) `;
      //console.log(msg);
      let { cards } = this;
      let card = EbtCard.pathToCard({
        path:fullPath, 
        cards, 
        defaultLang: this.langTrans,
        addCard: (opts) => this.addCard(opts),
      });
      if (card) {
        logger.debug(msg, card.context, card.id, );
      } else { // should never happen
        logger.warn(msg+"=> null", {card, fullPath, cards});
      }
      return card;
    },
    async saveSettings() {
      const msg = "settings.saveSettings() ";
      let dbg = DEBUG_SETTINGS;
      let saved = Utils.assignTyped({}, EbtSettings.INITIAL_STATE, this);
      logger.logLevel = saved.logLevel;
      let validRes = EbtSettings.validate(saved);
      if (validRes.changed) {
        Object.assign(this, validRes.changed);
      }
      if (validRes.error) {
        logger.warn(msg, error);
      }
      let json = JSON.stringify(saved);
      await Idb.set(SETTINGS_KEY, JSON.parse(json));
      dbg && console.log(msg, saved);
    },
    validate() {
      const msg = "settings.validate() ";
      return EbtSettings.validate(this);
    },
    removeCard(card, config) {
      const msg = "settings.removeCard() ";
      const { window } = globalThis;
      if (window == null) {
        //console.trace(msg, "no window");
        return;
      }
      if (config == null) {
        //console.trace(msg, "no config");
        return;
      }
      let { cards, langTrans:defaultLang } = this;
      let path = window.location.hash;
      cards = this.cards = cards.filter(c => c !== card);
      if (card.matchPath({path, defaultLang})) {
        let openCard = cards.filter(c => c.isOpen)[0];
        window.location.hash = openCard 
          ? openCard.routeHash() 
          : config.homePath;
      }
    },
    addCard(opts) {
      const msg = "settings.addCard()";
      let { cards, langTrans } = this;
      let { isOpen, context, location } = opts;
      let dbg = DEBUG_ADD_CARD, DEBUG_OPEN_CARD;
      let card = null;
      let loc = location ? location.join('/') : loc;
      switch (context) {
        case EbtCard.CONTEXT_WIKI:
          dbg && console.log(msg, `[1]${context}`, {isOpen, loc});
          card = new EbtCard(Object.assign({
            isOpen:false, // let user open card in tutorial
            langTrans
          }, opts));
          this.cards.push(card);
          break;
        case EbtCard.CONTEXT_DEBUG:
        case EbtCard.CONTEXT_SEARCH:
        case EbtCard.CONTEXT_SUTTA:
          dbg && console.log(msg, `[2]${context}`, {isOpen, loc});
          card = new EbtCard(Object.assign({langTrans}, opts));
          this.cards.push(card);
          /* await */ this.saveSettings();
          break;
        default:
          dbg && console.warn(msg, `[3]${context}`, {isOpen, loc});
          break;
      }
      return card;
    },
    moveCard(srcIndex, dstIndex) {
      let { cards } = this;
      let srcCard = cards[srcIndex];
      cards.splice(srcIndex, 1);
      cards.splice(dstIndex, 0, srcCard);
    },
    async scrollToElementId(idShow, idScroll) {
      const msg = 'settings.scrollToElementId() ';
      let eltShow = document.getElementById(idShow);
      let eltScroll = idScroll 
        ? document.getElementById(idScroll) 
        : eltShow;
      let dbg = DEBUG_SCROLL;
      if (eltShow == null) {
        dbg && console.log(msg, `DBG1 (${idShow}) no element`);
        return false;
      }
      if (eltScroll == null) {
        dbg && console.log(msg, `DBG2 (${idScroll}) no scroll element`);
        return false;
      }
      let idShowInView = elementInViewport(eltShow);
      let idScrollInView = eltShow === eltScroll
        ? idShowInView
        : elementInViewport(eltScroll);
      if (idShowInView && idScrollInView) {
        dbg && console.log(msg, `DBG3 no scroll`, 
          {eltShow, idShow, idScroll} );
        return false; // element already visible (no scrolling)
      }

      dbg && console.log(msg, `DBG4 (${idShow}) scrolling to`, 
        {eltScroll, idShow, idScroll, idShowInView, idScrollInView});
      setTimeout(()=>{ // scroll after Vue is done refreshing
        eltScroll.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }, 300);
      return true; // element originally not in viewport
    },
    async clear() {
      const msg = 'settings.clear() ';
      // remove legacy ebt-site settings
      delete localStorage.settings; 

      // clear out sutta cache and settings
      Idb.clear(); 

      // Save new settings
      Utils.assignTyped(this, EbtSettings.INITIAL_STATE);
      await this.saveSettings();
      //console.log(msg, this);
    },
    openCard(card) {
      const msg = "settings.openCard()";
      const dbg = DEBUG_OPEN_CARD;
      if (card.isOpen) {
        dbg && console.log(msg, `[1]already open`, card.id);
        return false;
      }
      dbg && console.log(msg, `[2]opening`, card.id);
      card.open(true);
      return true;
    },
    clickUrl() {
      let { clickVolume } = this;
      let volume = clickVolume || 0;
      return `audio/click${volume}.mp3`;
    },
    async scrollToCard(card) {
      const msg = 'settings.scrollToCard()';
      if (this.openCard(card)) {
        await new Promise(resolve => setTimeout(()=>resolve(), 100));
      }

      let curId = card.currentElementId;
      let topId = card.topAnchor;
      let scrolled = false;
      let dbg = DEBUG_SCROLL;
      if (curId === card.titleAnchor) {
        scrolled = await this.scrollToElementId(curId, topId);
        dbg && console.log(msg, "[1]", {curId, topId, scrolled});
        return scrolled;
      } 

      scrolled = await this.scrollToElementId(curId);
      if (scrolled) {
        dbg && console.log(msg, "[2]", {curId, scrolled});
      } else {
        dbg && console.log(msg, "[3]", {curId, scrolled});
      }
      return scrolled;
    },
    tutorialState(show) {
      return show === this.tutorClose &&
        show === this.tutorPlay &&
        show === this.tutorSearch &&
        show === this.tutorSettings &&
        show === this.tutorWiki;
    },
    homePath(config) {
      const msg = 'settings.homePath()';
      let dbg = DEBUG_HOME;
      let { homePath, tutorialPath } = config;
      let hp = this.tutorialState(false)
        ? homePath
        : tutorialPath || homePath;
      dbg && console.log(msg, hp);
      return hp;
    },
  },
  getters: {
    development(state) {
      let { logLevel } = state;
      return logLevel === 'debug' || logLevel === 'info';
    },
    audioVolume(state) {
      let { clickVolume } = state;
      return Number(clickVolume) / 4;
    },
    cardsOpen: (state)=>{
      let { cards } = state;
      return cards.reduce((a,v)=> (v.isOpen ? a+1: a), 0);
    },
    servers: (state)=>{ 
      let { window } = globalThis;
      let host = window && window.location.host;
      let isDev = host && (
        host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
      );
      let servers = EbtSettings.SERVERS.filter(svr => !svr.dev || isDev);
      return servers;
    },
    server: (state)=>{
      return state.servers.reduce((a,v) => {
        return v.value === state.serverUrl ? v : a;
      }, "unknown");
    },
  },

})