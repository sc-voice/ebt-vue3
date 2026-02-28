import { SuttaRef } from 'scv-esm/main.mjs';
import { 
  default as EbtCard,
  CONTEXT_PLAY,
  CONTEXT_SUTTA,
  CONTEXT_SEARCH,
  CONTEXT_WIKI,
  CONTEXT_GRAPH,
  CONTEXT_DEBUG,
  CONTEXT_PALI,
} from "../src/ebt-card.mjs";
import { default as CardFactory } from "../src/card-factory.mjs";
import { default as EbtConfig } from "../ebt-config.mjs";
import { DBG } from "../src//defines.mjs";
import { 
  useSettingsStore,
  useSuttasStore,
  useVolatileStore,
  useAudioStore,
  IdbSutta,
  Playlist,
} from '../src/index.mjs';
import should from "should";
import { setActivePinia, createPinia } from 'pinia';

// mock global environment
import "fake-indexeddb/auto";
global.window = {}
import 'mock-local-storage'

class MockSettings {
  constructor() {
    this.cards = [];
    this.langTrans =  'en';
  }

  homePath() { 
    return '#/wiki/welcome'; 
  }

  saveSettings() {
    const msg = "MockSettings.saveSettings()";
  }
}

(typeof describe === 'function') && 
  describe("card-factory.mjs", function () 
{
  beforeEach(() => {
    window.localStorage = global.localStorage
    setActivePinia(createPinia());
    global.fetch = global.fetch || fetch;
  });
  it("default ctor()", ()=>{
    let cf = new CardFactory();
    should(!!cf.settings).equal(true);
  });
  it("singleton", ()=>{
    let cf1 = CardFactory.singleton;
    should(cf1).instanceOf(CardFactory);
    should(CardFactory.singleton).equal(cf1);
  });
  it("pathToCard() content", ()=>{
    let cf = new CardFactory();
    let cards = [];
    let { homePath } = EbtConfig;
    let nAdd = 0;
    let langTrans = "test-lang";
    let addCard = (opts) => {
      let card = new EbtCard(Object.assign({langTrans},opts));
      //console.trace(`added card`, card);
      cards.push(card);
      nAdd++
      return card;
    }
    let cardHome = cf.pathToCard({path:homePath, cards, addCard});
    should(cardHome.context).equal(CONTEXT_WIKI);
    should.deepEqual(cards, [cardHome]);
    let cardHome2 = cf.pathToCard({path:homePath, cards, addCard});
    should.deepEqual(cards, [cardHome]);
    should.deepEqual(cardHome.location, homePath.split('/').slice(2));

    // since the home card is a singleton, the location must be updated
    let childPath = `#/${CONTEXT_WIKI}/x/y/z`;
    let cardHome3 = cf.pathToCard({path:childPath, cards, addCard});
    should.deepEqual(cards, [cardHome]);
    should.deepEqual(cardHome.location, childPath.split('/').slice(2));
  });
  it("pathToCard() search", ()=>{
    let cf = new CardFactory();
    let cards = [];
    let nAdd = 0;
    let langTrans = "test-lang";
    let addCard = (opts) => {
      let card = new EbtCard(Object.assign({langTrans},opts));
      //console.trace(`added card`, card);
      cards.push(card);
      nAdd++
      return card;
    }
    let cardEmpty = cf.pathToCard({path:'/', cards, addCard});
    should.deepEqual(cards, []);
    let cardEmpty2 = cf.pathToCard({path:'/', cards, addCard});
    should.deepEqual(cards, []);

    let cardHome = cf.pathToCard({path:'/wiki', cards, addCard});
    should.deepEqual(cards, [cardHome]);
    let cardHome2 = cf.pathToCard({path:'/wiki', cards, addCard});
    should.deepEqual(cards, [cardHome]);

    let cardSearch = cf.pathToCard(
      {path:'/search', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch]);
    let cardSearch2 = cf.pathToCard({
      path:'/search', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch]);

    let cardSearchAB = cf.pathToCard(
      {path:'/search/a%20b', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch, cardSearchAB]);
    let cardSearchAB2 = cf.pathToCard(
      {path:'/search/a%20b', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch, cardSearchAB]);

    let cardSearchABC = cf.pathToCard(
      {path:'/search/a%20b/c', cards, addCard});
    should.deepEqual(cards, 
      [cardHome, cardSearch, cardSearchAB, cardSearchABC]);
    let cardSearchAB3 = cf.pathToCard(
      {path:'/search/a%20b/c', cards, addCard});
    should.deepEqual(cards, 
      [cardHome, cardSearch, cardSearchAB, cardSearchABC]);
    let cardSearchABC2 = cf.pathToCard(
      {path:'/search/a%20b/c', cards, addCard});
    should.deepEqual(cards, 
      [cardHome, cardSearch, cardSearchAB, cardSearchABC]);

    should(nAdd).equal(4);
  });
  it("pathToCard() sutta", ()=>{
    let cf = new CardFactory();
    let cards = [];
    let nAdd = 0;
    let langTrans = "test-lang";
    let defaultLang = langTrans;
    let author = "test-author";
    let addCard = (opts) => {
      let card = new EbtCard(Object.assign({langTrans, author},opts));
      //console.trace(`added card`, card);
      cards.push(card);
      nAdd++
      return card;
    }
    let cardSN42_11 = cf.pathToCard({
      path:'/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);
    let cardSN42_11$2 = cf.pathToCard({
      path:'/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);

    let cardSN42_11_1_10 = cf.pathToCard({
      path:'/sutta/sn42.11:1.10', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);

    should(nAdd).equal(1);
  });
  it("pathToCard() creates new card for different sutta", () => {
    // Bug test: navigating from mn1 to mn3 should create separate cards
    let cf = new CardFactory();
    let cards = [];
    let langTrans = "en";
    let defaultLang = langTrans;
    let addCard = (opts) => {
      let card = new EbtCard(Object.assign({langTrans}, opts));
      cards.push(card);
      return card;
    };

    // Create card for mn1
    let cardMN1 = cf.pathToCard({
      path: '/sutta/mn1/en/sujato',
      cards,
      addCard,
      defaultLang
    });
    should(cards.length).equal(1);
    should(cardMN1.location[0]).match(/mn1/);

    // Navigate to mn3 - should create NEW card (different sutta_uid)
    let cardMN3 = cf.pathToCard({
      path: '/sutta/mn3/en/sujato',
      cards,
      addCard,
      defaultLang
    });

    // Bug check: If mn3 card !== mn1 card, new card was created (correct)
    // If mn3 card === mn1 card with location still mn1, bug exists
    should(cards.length).equal(2); // Two separate cards
    should(cardMN3.location[0]).match(/mn3/);
    should(cardMN3).not.equal(cardMN1);
  });
  it("pathToCard() handles path with query params before hash", () => {
    // Test: URL like ?src=sc#/sutta/mn3/en/sujato
    let cf = new CardFactory();
    let cards = [];
    let langTrans = "en";
    let defaultLang = langTrans;
    let addCard = (opts) => {
      let card = new EbtCard(Object.assign({langTrans}, opts));
      cards.push(card);
      return card;
    };

    // Test various path formats that might come from Vue Router
    let card1 = cf.pathToCard({
      path: '/sutta/mn3/en/sujato',  // Normal path
      cards,
      addCard,
      defaultLang
    });
    should(cards.length).equal(1);
    should(card1.location[0]).match(/mn3/);

    // Test with hash prefix (shouldn't happen from Vue Router, but test anyway)
    let card2 = cf.pathToCard({
      path: '#/sutta/mn4/en/sujato',
      cards,
      addCard,
      defaultLang
    });
    should(cards.length).equal(2);
    should(card2.location[0]).match(/mn4/);

    // Test with full URL format including query string (edge case)
    let card3 = cf.pathToCard({
      path: '?src=sc#/sutta/mn5/en/sujato',
      cards,
      addCard,
      defaultLang
    });
    should(cards.length).equal(3);
    should(card3.location[0]).match(/mn5/);
  });
  it("pathToCard() /#", ()=>{
    let cf = new CardFactory();
    let cards = [];
    let nAdd = 0;
    let langTrans = "test-lang";
    let defaultLang = langTrans;
    let author = "test-author";
    let addCard = (opts) => {
      let card = new EbtCard(Object.assign({langTrans, author},opts));
      //console.trace(`added card`, card);
      cards.push(card);
      nAdd++
      return card;
    }
    let cardSN42_11 = cf.pathToCard({
      path:'/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);
    let card = cf.pathToCard({
      path:'/#/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);
  });
  it("addCard() PLAY", async ()=>{
    const msg = 'test.card-factory@187';
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_PLAY;
    let sutta_uid = 'thig1.2';
    let scid = `${sutta_uid}:1.3`;
    let lang = 'en';
    let author = 'soma';
    let pattern = `thig1.1-5 -dl ${lang} -da ${author}`;
    let location = [scid, lang, author, pattern];
    let opts = { isOpen, context, location };
    //DBG.ADD_CARD = true;
    settings.cards = [];

    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, location);
    let { playlist } = card;
    should(playlist).instanceOf(Playlist);
    should(playlist.docAuthor).equal(author);
    should(playlist.docLang).equal(lang);
    should(playlist.suttaRefs).equal(undefined);

    if (DBG.TEST_WITH_FETCH) {
      await new Promise(resolve=>setTimeout(()=>resolve(),1000));
      should(playlist.docAuthor).equal(author);
      should(playlist.docLang).equal(lang);
      should(playlist.pattern).equal(pattern);
      should(playlist.suttaRefs).instanceOf(Array);
      should.deepEqual(playlist.suttaRefs.map(sr=>sr.toString()), [
        'thig1.1/en/soma',
        `${scid}/en/soma`,
        'thig1.3/en/soma',
        'thig1.4/en/soma',
        'thig1.5/en/soma',
      ]);
    }
  });
  it("addCard() SUTTA thig1.2", ()=>{
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_SUTTA;
    let sutta_uid = 'thig1.2';
    let scid = `${sutta_uid}:1.3`;
    let lang = 'en';
    let author = 'sujato';
    let location = [scid ];
    let opts = { isOpen, context, location };
    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, [ scid, lang, author]);
    should(card.isOpen).equal(isOpen);
    should(card.playlist).equal(undefined);
  });
  it("addCard() SUTTA thig1.2:1.3/en/soma", ()=>{
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_SUTTA;
    let sutta_uid = 'thig1.2';
    let scid = `${sutta_uid}:1.3`;
    let lang = 'en';
    let author = 'soma';
    let location = [scid, lang, author ];
    let opts = { isOpen, context, location };
    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, location);
    should(card.isOpen).equal(isOpen);
    should(card.playlist).equal(undefined);
  });
  it("addCard() WIKI", ()=>{
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_WIKI;
    let location = [ 'welcome' ];
    let opts = { isOpen, context, location };
    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, location);
    should(card.isOpen).equal(false);
    should(card.playlist).equal(undefined);
  });
  it("addCard() SEARCH", ()=>{
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_SEARCH;
    let location = [ 'root of suffering' ];
    let opts = { isOpen, context, location };
    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, location);
    should(card.isOpen).equal(true);
    should(card.playlist).equal(undefined);
  });
  it("addCard() DEBUG", ()=>{
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_DEBUG;
    let location = [ 'root of suffering' ];
    let opts = { isOpen, context, location };
    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, location);
    should(card.isOpen).equal(true);
    should(card.playlist).equal(undefined);
  });
  it("addCard() PALI", ()=>{
    let settings = new MockSettings();
    let cf = new CardFactory({settings});
    let isOpen = true;
    let context = CONTEXT_PALI;
    let location = [ 'dhamma' ];
    let opts = { isOpen, context, location };
    let card = cf.addCard(opts);
    should(settings.cards[0]).equal(card);
    should(card.context).equal(context);
    should.deepEqual(card.location, location);
    should(card.isOpen).equal(true);
    should(card.playlist).equal(undefined);
  });
});
