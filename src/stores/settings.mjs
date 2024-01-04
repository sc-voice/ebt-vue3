import { ref, nextTick } from "vue";
import { defineStore } from 'pinia';
import { logger } from 'log-instance/index.mjs';
import Utils from "../utils.mjs";
import { SuttaRef, AuthorsV2 } from 'scv-esm/main.mjs';
import { default as EbtSettings } from "../ebt-settings.mjs";
import { default as EbtCard } from "../ebt-card.mjs";
import { 
  DBG_OPEN_CARD, DBG_ADD_CARD, DBG_HOME, DBG_SETTINGS, 
  DBG_ROUTE, DBG_SCROLL, DBG_FOCUS, DBG_CARD_PATH,
  DBG_VERBOSE, DBG_REMOVE_CARD,
} from '../defines.mjs';
import * as Idb from "idb-keyval"; 

const SETTINGS_KEY = "settings";
var id = 1;


const refConfig = ref(null);

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
      let dbg = DBG_SETTINGS || DBG_ADD_CARD;
      if (this.loaded) {
        return this;
      }
      refConfig.value = config;
      let state = Utils.assignTyped({}, EbtSettings.INITIAL_STATE);
      let savedState = await Idb.get(SETTINGS_KEY);
      if (savedState) {
        try {
          let { serverUrl, cards, logLevel } = savedState;
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
          if (serverUrl === "https://s1.sc-voice.net/scv") {
            savedState.serverUrl = EbtSettings.SERVERS[0].value;
            dbg && console.log(msg, "[2]serverUrl", savedState.serverUrl);
          }
          //console.log(msg, {pathCard});
        } catch(e) {
          console.warn(msg, savedState, e);
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
      const dbg = DBG_CARD_PATH;
      let { cards } = this;
      let card = EbtCard.pathToCard({
        path:fullPath, 
        cards, 
        defaultLang: this.langTrans,
        addCard: (opts) => this.addCard(opts),
      });
      if (card) {
        dbg && console.log(msg, '[1]', card.debugString);
      } else { 
        dbg && console.log(msg, "[2]no card", {fullPath, cards});
      }
      return card;
    },
    async saveSettings() {
      const msg = "settings.saveSettings() ";
      let dbg = DBG_SETTINGS;
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
      const dbg = DBG_REMOVE_CARD;
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
      let iCard = this.cards.indexOf(card);
      dbg && console.log(msg, '[1]splice', iCard, this.cards);
      this.cards.splice(iCard,1);
      if (card.matchPath({path, defaultLang})) {
        let openCard = cards.filter(c => c.isOpen)[0];
        let hash;
        if (openCard) {
          hash = openCard.routeHash();
          dbg && console.log(msg, '[2]route=>openCard', hash);
        } else {
          hash = ''; // this.homePath(config);
          dbg && console.log(msg, '[3]no open card', hash);
        }
        window.location.hash = hash;
      }
    },
    addCard(opts) {
      const msg = "settings.addCard()";
      let { cards, langTrans } = this;
      let { isOpen, context, location } = opts;
      let dbg = DBG_ADD_CARD, DBG_OPEN_CARD;
      let card = null;
      let loc = location ? location.join('/') : loc;
      switch (context) {
        case EbtCard.CONTEXT_WIKI: {
          let homePath = this.homePath();
          dbg && console.log(msg, `[1]${context}`, {isOpen, loc});
          card = new EbtCard(Object.assign({
            isOpen:false, // let user open card in tutorial
            langTrans,
          }, opts));
          this.cards.push(card);
        } break;
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
    scrollableElement(idShow, idScroll) {
      const msg = 'settings.scrollableElement() ';
      const dbg = DBG_SCROLL;
      let eltShow = document.getElementById(idShow);
      if (eltShow == null) {
        //dbg && console.log(msg, `[1]eltShow? ${idShow}`);
        return null;
      }

      let eltScroll = idScroll 
        ? document.getElementById(idScroll) 
        : eltShow;
      if (eltScroll == null) {
        //dbg && console.log(msg, `[2]eltScroll? ${idScroll}`);
        return null;
      }

      let idShowInView = Utils.elementInViewport(eltShow);
      let idScrollInView = eltShow === eltScroll
        ? idShowInView
        : Utils.elementInViewport(eltScroll);
      if (idShowInView && idScrollInView) {
        //dbg && console.log(msg, `[3]inView`, {idShow, idScroll} );
        return null; // element already visible (no scrolling)
      }

      //dbg && console.log(msg, `[4]scrollable`, eltScroll.id);
      return eltScroll;
    },
    scrollToElement(eltScroll) {
      const msg = 'settings.scrollToElement()';
      const dbg = DBG_SCROLL;

      let opts = {
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      }
      dbg && console.log(msg, `[4]scrollToElement`, 
        eltScroll.id || eltScroll);
      eltScroll.scrollIntoView(opts);
    },
    async scrollToElementId(idShow, idScroll) {
      const msg = 'settings.scrollToElementId()';
      const dbg = DBG_SCROLL;
      const dbgv = dbg && DBG_VERBOSE;

      // HACK: scroll after Vue is done refreshing
      await new Promise(resolve => setTimeout(()=>resolve(), 300));

      let eltScroll = this.scrollableElement(idShow, idScroll);
      if (!eltScroll) {
        dbgv && console.log(msg, '[1]eltScroll?');
        return false;
      }

      this.scrollToElement(eltScroll);

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
      const dbg = DBG_OPEN_CARD;
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
    tutorialState(show) {
      return show === this.tutorClose &&
        show === this.tutorPlay &&
        show === this.tutorSearch &&
        show === this.tutorSettings &&
        show === this.tutorWiki;
    },
    homePath(config=refConfig.value) {
      const msg = 'settings.homePath()';
      let dbg = DBG_HOME;
      let { homePath, tutorialPath } = config;
      let hp = this.tutorialState(false)
        ? homePath
        : tutorialPath || homePath;
      dbg && console.log(msg, hp);
      return hp;
    },
  },
  getters: {
    openCards(state) {
      let { cards } = state;
      return cards.filter(c=>c.isOpen);
    },
    wikiCard(state) {
      let { cards } = state;
      return cards.reduce((a,c)=>{
        return a || (c.context === EbtCard.CONTEXT_WIKI ? c : a)
      }, null);
    },
    development(state) {
      let { logLevel } = state;
      return logLevel === 'debug' || logLevel === 'info';
    },
    audioVolume(state) {
      let { clickVolume } = state;
      return Number(clickVolume) / 4;
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
