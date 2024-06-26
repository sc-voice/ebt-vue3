import { SuttaRef } from 'scv-esm/main.mjs';
import { default as EbtCard } from "../src/ebt-card.mjs";
import { default as EbtConfig } from "../ebt-config.mjs";
import { logger } from "log-instance/index.mjs";
import should from "should";

logger.logLevel = 'warn';

(typeof describe === 'function') && 
  describe("ebt-card.mjs", function () 
{
  it("default ctor", async () => {
    let card1 = new EbtCard();
    let card2 = new EbtCard();
    let defaultProps = {
      context: EbtCard.CONTEXT_WIKI,
      location: [],
      isOpen: false,
      data: undefined,
    }
    should(card1.id.length).equal(12);
    should(card1.tab1Id.length).equal(17);
    should(card1.autofocusId.length).equal(22);
    should(card1).properties(defaultProps);

    // there is only one wiki card
    should(card2.id).equal(card1.id);
    should(card2.autofocusId).equal(card1.autofocusId);
    should(card2.tab1Id).equal(card1.tab1Id);
    should(card2).properties(defaultProps);
  });
  it("constants", ()=>{
    should(EbtCard.CONTEXT_PALI).equal('pali');
    should(EbtCard.CONTEXT_DEBUG).equal('debug');
    should(EbtCard.CONTEXT_WIKI).equal('wiki');
    should(EbtCard.CONTEXT_SEARCH).equal('search');
    should(EbtCard.CONTEXT_SUTTA).equal('sutta');
    should(EbtCard.CONTEXT_PLAY).equal('play');
  });
  it("custom ctor", async () => {
    let id = 'test-id';
    let context = 'search';
    let location = 'test-location';
    let data = "test-data";
    let langTrans = "test-lang";
    let card1 = new EbtCard({id, context, location, data, langTrans});
    should(card1).properties({id, context, location: [location,langTrans], data});
    let card2 = new EbtCard(Object.assign({}, card1));
    should(card2).properties(card1);
  });
  it("debugString", ()=>{
    let id = 'test-id';
    let context = 'search';
    let location = ['a','b'];
    let data = "test-data";
    let langTrans = "test-lang";
    let card = new EbtCard({id, context, location, data, langTrans});
    should(card.debugString).equal(`${id}+${context}`);
    card.isOpen = false;
    should(card.debugString).equal(`${id}-${context}`);
  });
  it("custom ctor sutta/thig1.1/pt", ()=>{
    let id = 'test-id';
    let context = 'sutta';
    let location = ['thig1.1', 'pt'];
    let data = "test-data";
    let author = 'laera-quaresma';
    let langTrans = 'en';
    let card1 = new EbtCard({id, context, location, data, langTrans});
    should(card1).properties({id, context, location, data});
    let card2 = new EbtCard(Object.assign({}, card1));
    should(card2).properties(card1);
  });
  it("icon", async() => {
    let card = new EbtCard();
    should(card.icon).equal("mdi-wikipedia");
    let cardWiki = new EbtCard({ context: EbtCard.CONTEXT_WIKI});
    should(cardWiki.icon).equal("mdi-wikipedia");
  });
  it("stringify", async() => {
    let card1 = new EbtCard();
    let json = JSON.stringify(card1);
    let card2 = new EbtCard(JSON.parse(json));
    should(card2).properties(card1);
  });
  it("matchPath() wiki context", async() => {
    let context = EbtCard.CONTEXT_WIKI;
    let card0 = new EbtCard({ context: "" });
    let card1 = new EbtCard({ context, });
    let card2 = new EbtCard({ context, location:["a","b c"], });

    let noPaths = [
      "/",
      "/search/a",
      "#/search/a",
    ];
    noPaths.forEach(path=>{
      //TODO should(card0.matchPath(path)).equal(false);
      //TODO should(card1.matchPath(path)).equal(false);
      //TODO should(card2.matchPath(path)).equal(false);
    });

    let cardPaths = [
      "/wiki/a",
      "#/wiki/a",
      "/wiki/a/b c",
      "/Wiki/a/b%20c",
      "/WIKI/A/B%20C",
      "#/WIKI/A/B%20C",
      "/WIKI/A/B%20C/",
      "#/WIKI/A/B%20C/",
    ];
    cardPaths.forEach(path => {
      should(card0.matchPath(path)).equal(true);
      should(card1.matchPath(path)).equal(true);
      should(card2.matchPath(path)).equal(true);
    });
  });
  it("matchPath() search context", async() => {
    let langTrans = 'test-lang';
    let card1 = new EbtCard({ 
      context: "search", langTrans});
    let card2 = new EbtCard({ 
      context: "SEARCH", location: ["A b"], langTrans});
    should.deepEqual(card2.location, ['A b', langTrans]);

    let noPaths = [
      "/",
      "#/",
      "/search/nothing",
      "#/search/nothing",
      "/asdf",
      "search",
      "search/a",
      `search/x/${langTrans}`,
    ];
    noPaths.forEach(path=>{
      should(card1.matchPath(path)).equal(false);
      should(card2.matchPath(path)).equal(false);
    });

    let card1Paths = [
      {path: '/search//', defaultLang: langTrans},
      {path: '#/search//', defaultLang: langTrans},
      `/search//${langTrans}`,
      `#/search//${langTrans}`,
    ];
    card1Paths.forEach(path=>{
      should(card1.matchPath(path)).equal(true);
      should(card2.matchPath(path)).equal(false);
    });

    let card2Paths = [
      {path: '/search/a%20b', defaultLang: langTrans},
      `/search/a%20b`,
      `/search/a%20b/${langTrans}`,
      `#/search/a%20b/${langTrans}/`,
      `#/search/a%20b`,
      `/SEARCH/A%20B/${langTrans.toUpperCase()}`,
      `#/SEARCH/A%20B/${langTrans.toUpperCase()}/`,
    ];
    card2Paths.forEach(path=>{
      should(card1.matchPath(path)).equal(false);
      should(card2.matchPath(path)).equal(true);
    });
  });
  it("matchPath() sutta context", async() => {
    let locSutta = "sn35.1";
    let locSegA = `${locSutta}:1.10`;
    let locSegB = `${locSutta}:2.3`;
    let langTrans = 'de';
    let context = 'sutta';
    let author = 'sabbamitta';
    let notSutta = "thig1.1";
    let notLang = 'en';
    let notAuthor = 'sujato';

    // create fully specified cards
    let cardSutta = new EbtCard({ context, location: [locSutta, langTrans, author]});
    let cardSegA = new EbtCard({ context, location: [locSegA, langTrans, author]});
    let cardSegB = new EbtCard({ context, location: [locSegB, langTrans, author]});

    let dbg = 0;
    if (dbg) {
      //let path = `/sutta/${locSutta}`;
      //should(cardSegA.matchPath(path)).equal(false);
    }

    // not matches
    let noPaths = [
      `sutta/thig1.1`,
      `/wiki`,
      `/search/${locSutta}`,
      `/search/${locSutta}/${langTrans}`,
      `/search/${locSutta}/${langTrans}/${author}`,

      `/sutta/${notSutta}`, 
      `/sutta/${notSutta}/${langTrans}`,
      `/sutta/${notSutta}/${langTrans}/${author}`,
      `/sutta/${locSutta}`, // defaultLang is pli
      `/sutta/${locSegA}`, // defaultLang is pli
      `/sutta/${locSegB}`, // defaultLang is pli
      `/sutta/${locSutta}/${notLang}`,
      `/sutta/${locSutta}/${notLang}/${notAuthor}`,
      `/sutta/${locSutta}/${notLang}/${author}`,
      `/sutta/${locSutta}/${langTrans}/${notAuthor}`,
      `/sutta/${locSegA}/${notLang}`,
      `/sutta/${locSegA}/${notLang}/${notAuthor}`,
      `/sutta/${locSegA}/${notLang}/${author}`,
      `/sutta/${locSegA}/${langTrans}/${notAuthor}`,
      `sutta/mn1`,
      `/sutta`,
    ];
    noPaths.forEach(path=>{
      should(cardSutta.matchPath(path)).equal(false);
      should(cardSegA.matchPath(path)).equal(false);
      should(cardSegB.matchPath(path)).equal(false);
    });

    // match without segment number
    let suttaPaths = [
      { path: `/sutta/${locSutta}`, defaultLang: langTrans },
      { path: `#/sutta/${locSutta}`, defaultLang: langTrans },
      `/sutta/${locSutta}/${langTrans}`,
      `#/sutta/${locSutta}/${langTrans}`,
      `/sutta/${locSutta}/${langTrans}/${author}`,
      `#/sutta/${locSutta}/${langTrans}/${author}`,
    ];
    suttaPaths.forEach(path => {
      should(cardSutta.matchPath(path)).equal(true);
      should(cardSegA.matchPath(path)).equal(true);
      should(cardSegB.matchPath(path)).equal(true);
    });

    // match with segment number
    let segPaths = [
      { path: `#/sutta/${locSegA}`, defaultLang: langTrans},
      { path: `/sutta/${locSegA}`, defaultLang: langTrans},
      { path: `/sutta/${locSegB}`, defaultLang: langTrans},
      `/sutta/${locSegA}/${langTrans}`,
      `#/sutta/${locSegA}/${langTrans}`,
      `/sutta/${locSegA}/${langTrans}/${author}`,
      `#/sutta/${locSegA}/${langTrans}/${author}`,
    ];
    segPaths.forEach(path => {
      should(cardSutta.matchPath(path)).equal(true);
      should(cardSegA.matchPath(path)).equal(true);
      should(cardSegB.matchPath(path)).equal(true);
    });
  });
  it("pathToCard() content", ()=>{
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
    let cardHome = EbtCard.pathToCard({path:homePath, cards, addCard});
    should(cardHome.context).equal(EbtCard.CONTEXT_WIKI);
    should.deepEqual(cards, [cardHome]);
    let cardHome2 = EbtCard.pathToCard({path:homePath, cards, addCard});
    should.deepEqual(cards, [cardHome]);
    should.deepEqual(cardHome.location, homePath.split('/').slice(2));

    // since the home card is a singleton, the location must be updated
    let childPath = `#/${EbtCard.CONTEXT_WIKI}/x/y/z`;
    let cardHome3 = EbtCard.pathToCard({path:childPath, cards, addCard});
    should.deepEqual(cards, [cardHome]);
    should.deepEqual(cardHome.location, childPath.split('/').slice(2));
  });
  it("pathToCard() search", ()=>{
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
    let cardEmpty = EbtCard.pathToCard({path:'/', cards, addCard});
    should.deepEqual(cards, []);
    let cardEmpty2 = EbtCard.pathToCard({path:'/', cards, addCard});
    should.deepEqual(cards, []);

    let cardHome = EbtCard.pathToCard({path:'/wiki', cards, addCard});
    should.deepEqual(cards, [cardHome]);
    let cardHome2 = EbtCard.pathToCard({path:'/wiki', cards, addCard});
    should.deepEqual(cards, [cardHome]);

    let cardSearch = EbtCard.pathToCard(
      {path:'/search', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch]);
    let cardSearch2 = EbtCard.pathToCard({
      path:'/search', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch]);

    let cardSearchAB = EbtCard.pathToCard(
      {path:'/search/a%20b', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch, cardSearchAB]);
    let cardSearchAB2 = EbtCard.pathToCard(
      {path:'/search/a%20b', cards, addCard});
    should.deepEqual(cards, [cardHome, cardSearch, cardSearchAB]);

    let cardSearchABC = EbtCard.pathToCard(
      {path:'/search/a%20b/c', cards, addCard});
    should.deepEqual(cards, 
      [cardHome, cardSearch, cardSearchAB, cardSearchABC]);
    let cardSearchAB3 = EbtCard.pathToCard(
      {path:'/search/a%20b/c', cards, addCard});
    should.deepEqual(cards, 
      [cardHome, cardSearch, cardSearchAB, cardSearchABC]);
    let cardSearchABC2 = EbtCard.pathToCard(
      {path:'/search/a%20b/c', cards, addCard});
    should.deepEqual(cards, 
      [cardHome, cardSearch, cardSearchAB, cardSearchABC]);

    should(nAdd).equal(4);
  });
  it("pathToCard() sutta", ()=>{
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
    let cardSN42_11 = EbtCard.pathToCard({
      path:'/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);
    let cardSN42_11$2 = EbtCard.pathToCard({
      path:'/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);

    let cardSN42_11_1_10 = EbtCard.pathToCard({
      path:'/sutta/sn42.11:1.10', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);

    should(nAdd).equal(1);
  });
  it("pathToCard() /#", ()=>{
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
    let cardSN42_11 = EbtCard.pathToCard({
      path:'/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);
    let card = EbtCard.pathToCard({
      path:'/#/sutta/sn42.11', cards, addCard, defaultLang});
    should.deepEqual(cards, [cardSN42_11]);
  });
  it("routeHash() sutta", ()=>{
    let context = 'sutta';
    let suid = 'sn34.1';
    let suidSeg = `${suid}:2.3`;
    let suidSeg2 = `${suid}:4.1`;
    let langTrans = "de";
    let author = "sabbamitta";
    let cardSuid = new EbtCard({context, location:[suid, langTrans, author]});
    let cardSuidSeg = new EbtCard({context, location:[suidSeg, langTrans, author]});

    // no arguments uses existing card location
    should(cardSuid.routeHash()).equal(`#/${context}/${suid}/${langTrans}/${author}`);
    should(cardSuidSeg.routeHash())
      .equal(`#/${context}/${suidSeg}/${langTrans}/${author}`);

    // update location segment id
    should(cardSuid.routeHash(`/${context}/${suidSeg2}`))
      .equal(`#/${context}/${suidSeg2}/${langTrans}/${author}`);
    should.deepEqual(cardSuid.location, [suidSeg2, langTrans, author]);
    should(cardSuidSeg.routeHash(`/${context}/${suidSeg2}`))
      .equal(`#/${context}/${suidSeg2}/${langTrans}/${author}`);
    should.deepEqual(cardSuidSeg.location, [suidSeg2, langTrans, author]);
    
    // remove segment id
    should(cardSuidSeg.routeHash(`/${context}/${suid}`))
      .equal(`#/${context}/${suid}/${langTrans}/${author}`);
    should.deepEqual(cardSuidSeg.location, [suid, langTrans, author]);
  });
  it('incrementLocation() sutta', ()=>{
    let context = 'sutta';
    let suid = 'sn34.1';
    let scids = [ '1.0', '1.1', '2.1'].map(id=>`${suid}:${id}`);
    let segments = scids.map(scid => ({scid}));
    let langTrans = "de";
    let author = "sabbamitta";
    let location = [ segments[0].scid, langTrans, author ];
    let card = new EbtCard({context, location});

    // forward
    should.deepEqual(card.location, [ scids[0], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments, delta:1}), {
      location: [ scids[1], langTrans, author, ],
      iSegment: 1,
    });
    should.deepEqual(card.location, [ scids[1], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments}), {
      location: [ scids[2], langTrans, author, ],
      iSegment: 2,
    });
    should.deepEqual(card.incrementLocation({segments}), null);
    should.deepEqual(card.location, [ scids[2], langTrans, author, ]);

    // backward
    should.deepEqual(card.incrementLocation({segments, delta:-1}), {
      location: [ scids[1], langTrans, author, ],
      iSegment: 1,
    });
    should.deepEqual(card.location, [ scids[1], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments, delta:-1}), {
      location: [ scids[0], langTrans, author, ],
      iSegment: 0,
    });
    should.deepEqual(card.location, [ scids[0], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments, delta:-1}), null);
    should.deepEqual(card.location, [ scids[0], langTrans, author, ]);
  });
  it('incrementLocation() ranged sutta', ()=>{
    let context = 'sutta';
    let suid = 'sn34.1';
    let scids = [ 
      'dhp1:1.0', 
      'dhp1:1.1', 
      'dhp2:1.0', 
      'dhp2:1.1', 
    ];
    let segments = scids.map(scid => ({scid}));
    let langTrans = "en";
    let author = "sujato";
    let location = [ segments[0].scid, langTrans, author ];
    let card = new EbtCard({context, location});

    // forward
    should.deepEqual(card.location, [ scids[0], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments, delta:1}), {
      location: [ scids[1], langTrans, author, ],
      iSegment: 1,
    });
    should.deepEqual(card.location, [ scids[1], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments}), {
      location: [ scids[2], langTrans, author, ],
      iSegment: 2,
    });
    should.deepEqual(card.location, [ scids[2], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments}), {
      location: [ scids[3], langTrans, author, ],
      iSegment: 3,
    });
    should.deepEqual(card.incrementLocation({segments}), null);
    should.deepEqual(card.location, [ scids[3], langTrans, author, ]);

    // backward
    should.deepEqual(card.incrementLocation({segments, delta:-1}), {
      location: [ scids[2], langTrans, author, ],
      iSegment: 2,
    });
    should.deepEqual(card.incrementLocation({segments, delta:-1}), {
      location: [ scids[1], langTrans, author, ],
      iSegment: 1,
    });
    should.deepEqual(card.location, [ scids[1], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments, delta:-1}), {
      location: [ scids[0], langTrans, author, ],
      iSegment: 0,
    });
    should.deepEqual(card.location, [ scids[0], langTrans, author, ]);
    should.deepEqual(card.incrementLocation({segments, delta:-1}), null);
    should.deepEqual(card.location, [ scids[0], langTrans, author, ]);
  });
  it("setLocation() sutta", ()=>{
    let segments = [
      {scid:"test:1"},
      {scid:"test:2"},
      {scid:"test:3"},
    ];
    let location = ['test:1', 'test-lang', 'test-author'];
    let context = EbtCard.CONTEXT_SUTTA;
    let card = new EbtCard({context, location});

    // already at first location
    should(card.setLocation({segments, delta:0})).equal(null);

    // last location
    should.deepEqual(card.setLocation({segments, delta:-1}), {
      iSegment: 2,
      location: [ 'test:3', 'test-lang', 'test-author'],
    });

    // first location
    should.deepEqual(card.setLocation({segments, delta:0}), {
      iSegment: 0,
      location: [ 'test:1', 'test-lang', 'test-author'],
    });

    // second segment from start
    should.deepEqual(card.setLocation({segments, delta:1}), {
      iSegment: 1,
      location: [ 'test:2', 'test-lang', 'test-author'],
    });

    // third segment from end
    should.deepEqual(card.setLocation({segments, delta:-3}), {
      iSegment: 0,
      location: [ 'test:1', 'test-lang', 'test-author'],
    });

    // same location
    card.setLocation({segments, delta:0});
    should(card.setLocation({segments, delta:0})).equal(null);
    card.setLocation({segments, delta:1});
    should(card.setLocation({segments, delta:1})).equal(null);
    card.setLocation({segments, delta:-1});
    should(card.setLocation({segments, delta:-1})).equal(null);
  });
  it("setLocation() play", ()=>{
    let segments = [
      {scid:"test:1"},
      {scid:"test:2"},
      {scid:"test:3"},
    ];
    let locSuffix = [ 'test-lang', 'test-author', 'test-pat' ];
    let location = ['test:1', ...locSuffix ];
    let context = EbtCard.CONTEXT_PLAY;
    let card = new EbtCard({context, location});

    // already at first location
    should(card.setLocation({segments, delta:0})).equal(null);

    // last location
    let iSegment = 2;
    should.deepEqual(card.setLocation({segments, delta:-1}), {
      iSegment,
      location: [ `test:${iSegment+1}`, ...locSuffix ],
    });

    // first location
    iSegment = 0;
    should.deepEqual(card.setLocation({segments, delta:0}), {
      iSegment,
      location: [ `test:${iSegment+1}`, ...locSuffix ],
    });

    // second segment from start
    iSegment = 1;
    should.deepEqual(card.setLocation({segments, delta:1}), {
      iSegment,
      location: [ `test:${iSegment+1}`, ...locSuffix ],
    });

    // third segment from end
    should.deepEqual(card.setLocation({segments, delta:-3}), {
      iSegment: 0, location, });

    // same location
    card.setLocation({segments, delta:0});
    should(card.setLocation({segments, delta:0})).equal(null);
    card.setLocation({segments, delta:1});
    should(card.setLocation({segments, delta:1})).equal(null);
    card.setLocation({segments, delta:-1});
    should(card.setLocation({segments, delta:-1})).equal(null);
  });
  it("groupStartIndex() play", ()=>{
    let segments = [
      'test:1.1', 'test:1.2', 'test:2.1', 'test:2.2'
    ].map(scid=>({scid})); 
    let locationSuffix = ['test-lang', 'test-author', 'test-pat'];
    let location = [ segments[0].scid, ...locationSuffix ];
    let context = EbtCard.CONTEXT_PLAY;
    let card = new EbtCard({context, location});
    
    should(card.groupStartIndex({segments, iSegCur:0})).equal(0);
    should(card.groupStartIndex({segments, iSegCur:1})).equal(0);
    should(card.groupStartIndex({segments, iSegCur:2})).equal(2);
    should(card.groupStartIndex({segments, iSegCur:3})).equal(2);
  });
  it("groupStartIndex() sutta", ()=>{
    let segments = [
      'test:1.1', 'test:1.2', 'test:2.1', 'test:2.2'
    ].map(scid=>({scid})); 
    let locationSuffix = ['test-lang', 'test-author'];
    let location = [ segments[0].scid, ...locationSuffix ];
    let context = EbtCard.CONTEXT_SUTTA;
    let card = new EbtCard({context, location});
    
    should(card.groupStartIndex({segments, iSegCur:0})).equal(0);
    should(card.groupStartIndex({segments, iSegCur:1})).equal(0);
    should(card.groupStartIndex({segments, iSegCur:2})).equal(2);
    should(card.groupStartIndex({segments, iSegCur:3})).equal(2);
  });
  it("incrementGroup() play", ()=>{
    let segments = [
      'test:1.1', 'test10.12:1.2', 'test10.12:2.1', 'test10.12:2.2'
    ].map(scid=>({scid})); 
    let locationSuffix = ['test-lang', 'test-author', 'test-pat'];
    let location = [ segments[0].scid, ...locationSuffix ];
    let context = EbtCard.CONTEXT_PLAY;
    let card = new EbtCard({context, location});

    // Backward
    card.location[0] = segments[3].scid;
    should.deepEqual(card.incrementGroup({segments, delta:-1}), {
      iSegment: 2,
      location: [segments[2].scid, ...locationSuffix],
    });
    should(card.location[0]).equal(segments[2].scid);
    should.deepEqual(card.incrementGroup({segments, delta:-1}), {
      iSegment: 0,
      location: [segments[0].scid, ...locationSuffix],
    });
    should(card.location[0]).equal(segments[0].scid);
    should(card.incrementGroup({segments, delta:-1})).equal(null);

    // Forward
    card.location[0] = segments[0].scid;
    should.deepEqual(card.incrementGroup({segments, delta:1}), {
      iSegment: 2,
      location: [segments[2].scid, ...locationSuffix],
    });
    should(card.location[0]).equal(segments[2].scid);
    should.deepEqual(card.incrementGroup({segments, delta:1}), null);
    should(card.location[0]).equal(segments[2].scid);
  });
  it("incrementGroup() sutta", ()=>{
    let segments = [
      'test:1.1', 'test10.12:1.2', 'test10.12:2.1', 'test10.12:2.2'
    ].map(scid=>({scid})); 
    let locationSuffix = ['test-lang', 'test-author'];
    let location = [ segments[0].scid, ...locationSuffix ];
    let context = EbtCard.CONTEXT_SUTTA;
    let card = new EbtCard({context, location});

    // Backward
    card.location[0] = segments[3].scid;
    should.deepEqual(card.incrementGroup({segments, delta:-1}), {
      iSegment: 2,
      location: [segments[2].scid, ...locationSuffix],
    });
    should(card.location[0]).equal(segments[2].scid);
    should.deepEqual(card.incrementGroup({segments, delta:-1}), {
      iSegment: 0,
      location: [segments[0].scid, ...locationSuffix],
    });
    should(card.location[0]).equal(segments[0].scid);
    should(card.incrementGroup({segments, delta:-1})).equal(null);

    // Forward
    card.location[0] = segments[0].scid;
    should.deepEqual(card.incrementGroup({segments, delta:1}), {
      iSegment: 2,
      location: [segments[2].scid, ...locationSuffix],
    });
    should(card.location[0]).equal(segments[2].scid);
    should.deepEqual(card.incrementGroup({segments, delta:1}), null);
    should(card.location[0]).equal(segments[2].scid);
  });
  it("scidToDocUrl() thig1.1:1.2/en/soma", ()=>{
    let context = EbtCard.CONTEXT_SUTTA;
    let segnum = "1.2"
    let sref = SuttaRef.create(`thig1.1:${segnum}/en/soma`);
    let { sutta_uid, lang, author, scid } = sref;
    let card = new EbtCard({
      context,
      location: [scid, lang, author],
    });
    let origin = 'test-origin';
    global.window = { 
      location: { origin },
    };
    should(card.scidToDocUrl(scid))
      .equal(`${origin}/#/sutta/${sutta_uid}/${lang}/${author}`);
  });
  it("scidToApiUrl() thig1.1:1.2/en/soma", ()=>{
    let segnum = "1.2"
    let sref = SuttaRef.create(`thig1.1:${segnum}/en/soma`);
    let { sutta_uid, lang, author, scid } = sref;
    const API_URL = "https://www.api.sc-voice.net/scv/ebt-site";

    let suttaCard = new EbtCard({
      context: EbtCard.CONTEXT_SUTTA,
      location: [scid, lang, author],
    });
    should(suttaCard.scidToApiUrl(scid))
      .equal(`${API_URL}/${scid}/${lang}/${author}`);

    let playCard = new EbtCard({
      context: EbtCard.CONTEXT_PLAY,
      location: [scid, lang, author, 'test-pat'],
    });
    should(playCard.scidToApiUrl(scid))
      .equal(`${API_URL}/${scid}/${lang}/${author}`);
  });
  it("scidToSCUrl() thig1.1:1.2/en/soma", ()=>{
    let context = EbtCard.CONTEXT_SUTTA;
    let segnum = "1.2"
    let sref = SuttaRef.create(`thig1.1:${segnum}/en/soma`);
    let { sutta_uid, lang, author, scid } = sref;
    const SC_URL = "https://suttacentral.net";
    let card = new EbtCard({
      context,
      location: [scid, lang, author],
    });
    should(card.scidToSCUrl(scid))
      .equal(`${SC_URL}/${sutta_uid}/${lang}/${author}#1.2`);
  });
  it("segmentElementId()", ()=>{
    let scid = 'test-scid';
    let lang = 'test-lang';
    let author = 'test-author';
    let pat = 'test-pat';

    let card1 = new EbtCard({
      context: EbtCard.CONTEXT_SUTTA,
      location: [scid, lang, author],
    });
    should(card1.segmentElementId(scid))
      .equal(`seg-${scid}/${lang}/${author}`);

    let card2 = new EbtCard({
      context: EbtCard.CONTEXT_PLAY,
      location: [scid, lang, author, pat],
    });
    should(card2.segmentElementId(scid))
      .equal(`seg-${scid}/${lang}/${author}`);
  });
  it("routeSuttaRef() sutta", ()=>{
    const scid = 'mn44:1.2';
    const lang = 'en';
    const author = 'sujato';
    const sutta = [scid, lang, author].join('/');
    const vueRoute = `#/sutta/${sutta}`;
    const nuxtRoute = `/ebt-nuxt3/#/sutta/${sutta}`;
    const suttaRef = SuttaRef.create(sutta);
    const suttaRefNoAuthor = SuttaRef.create([scid, lang].join('/'));

    // valid routes
    should.deepEqual(suttaRef, 
      EbtCard.routeSuttaRef(`/ebt-nuxt3/#/sutta/${sutta}`));
    should.deepEqual(suttaRef, 
      EbtCard.routeSuttaRef(`#/sutta/${sutta}`));
    should.deepEqual(suttaRefNoAuthor,
      EbtCard.routeSuttaRef(`/ebt-nuxt3/#/sutta/${scid}`));
    should.deepEqual(suttaRefNoAuthor,
      EbtCard.routeSuttaRef(`#/sutta/${scid}`));

    //invalid routes
    should(EbtCard.routeSuttaRef('#/search/to%20kill/en')).equal(null);
    should(EbtCard.routeSuttaRef(EbtConfig.homePath)).equal(null);
    should(EbtCard.routeSuttaRef('#/')).equal(null);
    should(EbtCard.routeSuttaRef('/')).equal(null);
  });
  it("routeSuttaRef() play", ()=>{
    const scid = 'mn44:1.2';
    const lang = 'en';
    const author = 'sujato';
    const sutta = [scid, lang, author].join('/');
    const vueRoute = `#/play/${sutta}`;
    const nuxtRoute = `/ebt-nuxt3/#/play/${sutta}`;
    const suttaRef = SuttaRef.create(sutta);
    const suttaRefNoAuthor = SuttaRef.create([scid, lang].join('/'));

    // valid routes
    should.deepEqual(suttaRef, 
      EbtCard.routeSuttaRef(`/ebt-nuxt3/#/play/${sutta}`));
    should.deepEqual(suttaRef, 
      EbtCard.routeSuttaRef(`#/play/${sutta}`));
    should.deepEqual(suttaRefNoAuthor,
      EbtCard.routeSuttaRef(`/ebt-nuxt3/#/play/${scid}`));
    should.deepEqual(suttaRefNoAuthor,
      EbtCard.routeSuttaRef(`#/play/${scid}`));

    //invalid routes
    should(EbtCard.routeSuttaRef('#/search/to%20kill/en')).equal(null);
    should(EbtCard.routeSuttaRef(EbtConfig.homePath)).equal(null);
    should(EbtCard.routeSuttaRef('#/')).equal(null);
    should(EbtCard.routeSuttaRef('/')).equal(null);
  });
});
