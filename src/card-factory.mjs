import { v4 as uuidv4 } from 'uuid';
import { AuthorsV2, SuttaRef } from 'scv-esm/main.mjs';
import { default as Playlist } from './playlist.mjs';
import { default as EbtConfig } from "../ebt-config.mjs";
import { useSettingsStore } from './stores/settings.mjs';
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
    dbg && console.log(msg, {stetings});

    Object.assign(this, {
      config,
      settings,
    });
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
    const DUMMY_SUTTAREFS = [
      SuttaRef.create("thig1.1/en/soma"), 
      SuttaRef.create("thig1.2/en/soma"), 
      SuttaRef.create("thig1.3/en/soma"),
    ];
    let { 
      location=[] 
    } = opts;

    let suttaRefs = DUMMY_SUTTAREFS;
    let sref = SuttaRef.create(location.slice(0,3).join('/'));
    let index = 0;
    suttaRefs.forEach((sr,i)=>{ // update scid
      if (sr.sutta_uid === sref.sutta_uid) {
        sr.scid = sref.scid;
        index = i;
      }
    });
    let pattern = location[3];
    let { author:docAuthor, lang:docLang } = suttaRefs[0];
    let playlist = new Playlist({ 
      index, pattern, suttaRefs, docLang, docAuthor });
    opts.playlist = playlist;
    dbg && console.log(msg, '[1]playlist', 
      JSON.stringify(playlist));

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
    let {
      path='/', cards=[], addCard, defaultLang, isOpen,
    } = args;
    path = path.replace(/^.*\/#/, ''); // ignore non-hash part of path
    let [ ignored, context, ...location ] = path.split('/');
    location = location.map(loc => decodeURIComponent(loc));
    let card = cards.find(card => card.matchPath({path, defaultLang}));
    dbg && console.log(msg, '[1]find', {card, path});
    if (card == null) {
      if (addCard === undefined) {
        throw new Error(msg+"addCard is required");
      } 
      if (context) {
        dbg && console.log(msg, '[2]addCard', 
          {context,location,isOpen});
        card = addCard ? addCard({context, location, isOpen}) : null;
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
            dbg && console.log(msg, '[4]newLocation', card.debugString, 
              newLocation);
          }
        } break;
        case CONTEXT_PLAY:
        case CONTEXT_SUTTA: {
          if (location[0].indexOf(':') >= 0) { // different scid
            dbg && console.log(msg, '[5]location', card.debugString, 
              location[0]);
            card.location[0] = location[0];
          }
        } break;
      }
    }

    return card;
  }

}
