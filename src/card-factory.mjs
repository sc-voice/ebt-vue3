import { v4 as uuidv4 } from 'uuid';
import { AuthorsV2, SuttaRef } from 'scv-esm/main.mjs';
import { default as Playlist } from './playlist.mjs';
import { default as EbtConfig } from "../ebt-config.mjs";
import { useSettingsStore } from './stores/settings.mjs';
import { useVolatileStore } from './stores/volatile.mjs';
import { 
  default as EbtCard,
  CONTEXT_DEBUG,
  CONTEXT_WIKI,
  CONTEXT_PLAY,
  CONTEXT_SEARCH,
  CONTEXT_SUTTA,
  CONTEXT_GRAPH,
} from './ebt-card.mjs';
import { DBG, } from './defines.mjs';

export default class CardFactory {
  static #singleton;

  constructor(opts = {}) {
    let { 
      config=EbtConfig,
      settings,
    } = opts;
    let msg = 'CardFactory.ctor()';
    let dbg = DBG.CARD_FACTORY;

    if (settings == null) {
      settings = useSettingsStore();
      dbg && console.log(msg, '[1]settings');
    }

    Object.assign(this, {
      config,
      settings,
    });
  }

  static get singleton() { 
    if (this.#singleton == null) {
      this.#singleton = new CardFactory();
    }
    return this.#singleton; 
  }

  addCard(opts) {
    const msg = 'CardFactory.addCard()';
    const dbg = DBG.ADD_CARD;
    let { context } = opts;
    let { settings, } = this;
    let { langTrans } = settings;
    let newOpts = Object.assign({}, opts);

    switch (context) {
      case CONTEXT_WIKI:
        this.#wikiOptions(newOpts);
        break;
      case CONTEXT_PLAY: 
        this.#playOptions(newOpts);
        break;
      case CONTEXT_DEBUG:
      case CONTEXT_SEARCH:
      case CONTEXT_SUTTA:
      case CONTEXT_GRAPH:
        break;
      default:
        throw new Error(`${msg} invalid context:${context}`);
    }

    return this.#addCard(newOpts);
  }

  #playOptions(opts) {
    const msg = 'CardFactory.#playOptions()';
    const dbg = DBG.ADD_CARD;
    let { 
      location=[],
      playlist,
    } = opts;

    if (playlist) {
      dbg && console.log(msg, '[1]playlist', 
        JSON.stringify(playlist));
    } else {
      let suttaRefs = [];
      let [ scid, docLang, docAuthor, pattern ] = location;
      opts.playlist = playlist = new Playlist({
        docLang, docAuthor, pattern,
      });
      dbg && console.log(msg, '[2]!playlist', location);
      /* await */ playlist.resolveLocation(location);
    }

    return opts;
  }

  #wikiOptions(opts) {
    const msg = 'CardFactory.#wikiOptions()';
    const dbg = DBG.ADD_CARD;
    let { settings, config } = this;
    let homePath = settings.homePath(config);

    dbg && console.log(msg, `[1]${context}`);
    opts.isOpen = false;

    return opts;
  }

  #addCard(opts) {
    const msg = "CardFactory.#addCard()";
    let { settings, config, langTrans } = this;
    let { isOpen, context, location } = opts;
    let dbg = DBG.ADD_CARD;
    let card = null;
    let loc = location ? location.join('/') : loc;

    opts.langTrans = langTrans;
    card = new EbtCard(Object.assign({langTrans}, opts));
    settings.cards.push(card);
    /* await */ settings.saveSettings();

    return card;
  }

  pathToCard(args) {
    const msg = 'CardFactory.pathToCard()';
    const dbg = DBG.CARD_PATH;
    const dbgv = DBG.VERBOSE && dbg;
    let { settings } = this;
    let {
      path='/', cards=settings.cards, addCard, defaultLang, isOpen,
      playlist,
    } = args;
    path = path.replace(/^.*\/#/, ''); // ignore non-hash part of path
    let [ ignored, context, ...location ] = path.split('/');
    location = location.map(loc => decodeURIComponent(loc));
    let card = cards.find(card => card.matchPath({path, defaultLang}));
    dbgv && console.log(msg, '[1]find', {card, path});
    if (card == null) {
      if (addCard === undefined) {
        throw new Error(msg+"addCard is required");
      } 
      if (context) {
        let opts = { context, location, isOpen, };
        playlist && (opts.playlist = playlist);
        dbg && console.log(msg, '[2]addCard', opts);
        card = addCard ? addCard(opts) : null;
      }
    } else {
      dbg && console.log(msg, '[3]existing', card.debugString);
    } 

    if (card) { // context already matches, so check location
      switch (card.context) {
        case CONTEXT_WIKI: {
          let newLocation = path.split('/').slice(2);
          if (newLocation.length) {
            card.location = newLocation;
            dbgv && console.log(msg, '[4]newLocation', card.debugString, 
              newLocation);
          }
        } break;
        case CONTEXT_PLAY:
        case CONTEXT_SUTTA: {
          if (location[0].indexOf(':') >= 0) { // different scid
            dbgv && console.log(msg, '[5]location', card.debugString, 
              location[0]);
            card.location[0] = location[0];
          }
        } break;
      }
    }

    return card;
  }

}
