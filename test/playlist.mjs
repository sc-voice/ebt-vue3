import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '../src/stores/settings.mjs';
import { default as Playlist } from "../src/playlist.mjs";
import { default as EbtCard } from "../src/ebt-card.mjs";
import { DBG } from '../src/defines.mjs';
import { Tipitaka, SuttaRef } from "scv-esm/main.mjs";
import should from "should";

global.window = {};
const TEST_LANG = 'test-lang';
const TEST_AUTHOR = 'test-author';
const TEST_SUTTAREFS = [ 'thig1.1', 'thig1.2', 'thig1.3:3.4/en/soma'];
const TEST_PATTERN = 'test-pattern';

let settings;

(typeof describe ==='function') && 
 describe("playlist.mjs", function () {

  beforeEach(() => {
    window.localStorage = global.localStorage;
    setActivePinia(createPinia());
    global.fetch = global.fetch || fetch;
    settings = useSettingsStore();
    settings.docLang = TEST_LANG;
    settings.docAuthor = TEST_AUTHOR;
  });
  it("default ctor()", ()=>{
    const msg = "test.playlist@25";

    let pl = new Playlist();
    should(pl.pattern).equal(undefined);
    should(pl.docLang).equal(TEST_LANG);
    should(pl.docAuthor).equal(TEST_AUTHOR);
    should.deepEqual(pl.suttaRefs, undefined)
  });
  it("custom ctor()", ()=>{
    const msg = "test.playlist@33";
    const opts = {
      docLang: 'de',
      docAuthor: 'sabbamitta',
      suttaRefs: TEST_SUTTAREFS,
      pattern: TEST_PATTERN,
    }

    let pl = new Playlist(opts);

    // custom options override default
    should(pl.docLang).equal(opts.docLang);
    should(pl.docAuthor).equal(opts.docAuthor);
    should(pl.pattern).equal(opts.pattern);

    // Playlist normalizes suttaRefs
    should.deepEqual(pl.suttaRefs.map(sr=>sr.toString()), [
      'thig1.1/de/sabbamitta',
      'thig1.2/de/sabbamitta',
      'thig1.3:3.4/en/soma',
    ]);
  });
  it("cursor", ()=>{
    const msg = "test.playlist@54";
    let suttaRefs = TEST_SUTTAREFS;
    let docLang = 'de';
    let docAuthor = 'sabbamitta';
    const opts = { docLang, docAuthor, suttaRefs };
    let pl = new Playlist(opts);

    // Default cursor is at beginning of playlist
    should(pl.cursor.toString()).equal('thig1.1/de/sabbamitta');

    pl.cursor = 'thig1.2';
    should(pl.cursor.toString()).equal('thig1.2/de/sabbamitta');
    pl.cursor = 'thig1.3';
    should(pl.cursor.toString()).equal('thig1.3/en/soma');

    // Cursor can have a segment reference
    should(pl.suttaRefs[2].segnum).equal(undefined);
    should(pl.suttaRefs[2].scid).equal('thig1.3');
    pl.cursor = 'thig1.3:4.2';
    should(pl.cursor.toString()).equal('thig1.3:4.2/en/soma');
    should(pl.suttaRefs[2].segnum).equal('4.2');
    should(pl.suttaRefs[2].scid).equal('thig1.3:4.2');
  });
  it("cursor errors", ()=>{
    const msg = "test.playlist@78";
    let suttaRefs = TEST_SUTTAREFS;
    let docLang = 'de';
    let docAuthor = 'sabbamitta';
    const opts = { docLang, docAuthor, suttaRefs };
    let pl = new Playlist(opts);
11
    let eCaught;

    // Playlist has en/soma
    eCaught = null;
    try { pl.cursor = 'thig1.3/de/sabbamitta'; } 
    catch(e) { eCaught = e; }
    should(eCaught?.message).match(/not in playlist/);

    // There is no thig1.4 in playlist
    eCaught = null;
    try { pl.cursor = 'thig1.4'; }
    catch(e) { eCaught = e; }
    should(eCaught?.message).match(/not in playlist/);

    // Non-existent sutta
    eCaught = null;
    try { pl.cursor = 'nosutta'; }
    catch(e) { eCaught = e; }
    should(eCaught?.message).match(/not in playlist/);
  });
  it("serializable", ()=>{
    const msg = "test.playlist@106";
    const dbg = 0;
    let suttaRefs = TEST_SUTTAREFS;
    let docLang = 'de';
    let docAuthor = 'sabbamitta';
    const opts = { docLang, docAuthor, suttaRefs };
    let pl = new Playlist(opts);

    // Serialize
    let json = JSON.stringify(pl, null, 2);
    dbg && console.log(msg, json);
    let opts2 = JSON.parse(json);
    let pl2 = new Playlist(opts2);
    should.deepEqual(pl2, pl);
  });
  it("advance()", ()=>{
    const msg = "test.playlist@127";
    let suttaRefs = TEST_SUTTAREFS;
    let docLang = 'en';
    let pl = new Playlist({docLang, suttaRefs});
    should(pl.index).equal(0);
    should(pl.advance()).equal(true);
    should(pl.index).equal(1);
    should(pl.cursor.toString()).equal('thig1.2/en/sujato');
    should(pl.advance(-1)).equal(true);
    should(pl.cursor.toString()).equal('thig1.1/en/sujato');
    should(pl.advance(2)).equal(true);
    should(pl.cursor.toString()).equal('thig1.3:3.4/en/soma');
    should(pl.advance()).equal(false);
    should(pl.cursor.toString()).equal('thig1.3:3.4/en/soma');
    should(pl.advance(-4)).equal(false);
    should(pl.cursor.toString()).equal('thig1.3:3.4/en/soma');
    pl.index = 0;
    should(pl.advance(4)).equal(false);
    should(pl.cursor.toString()).equal('thig1.1/en/sujato');
  });
  it("empty()", ()=>{
    let pl = new Playlist();
    should(pl.cursor).equal(undefined);
    should(pl.advance(1)).equal(false);
    should(pl.advance(-1)).equal(false);
    should(pl.cursor).equal(undefined);
    should(pl.index).equal(0);
  });
  it("tipitaka", ()=>{
    let pl = new Playlist({
      docLang: 'en',
      docAuthor: 'sujato',
      suttaRefs:["thig1.2"],
    });
    should(Playlist.tipitaka).instanceOf(Tipitaka);

    // Start of nikaya
    should(pl.advance(1)).equal(true);
    should(pl.cursor.toString()).equal("thig1.3/en/sujato");
    should(pl.advance(-2)).equal(true);
    should(pl.cursor.toString()).equal("thig1.1/en/sujato");
    should(pl.advance(-1)).equal(false);
    should(pl.cursor.toString()).equal("thig1.1/en/sujato");

    // End of nikaya
    should(pl.advance(72)).equal(true);
    should(pl.cursor.toString()).equal("thig16.1/en/sujato");
    should(pl.advance(1)).equal(false);
    should(pl.cursor.toString()).equal("thig16.1/en/sujato");
  });
  it("fromCard()", ()=>{
    let lang = 'en';
    let author_uid = 'soma';
    let pattern = 'thig1.1-3';
    let card = {
      context: EbtCard.CONTEXT_SEARCH,
      location: [ pattern, lang ],
      data: [
        { uid:'thig1.1', lang, author_uid },
        { uid:'thig1.2', lang, author_uid },
        { uid:'thig1.3', lang, author_uid },
      ],
    };
    let playlist = Playlist.fromCard(card);
    should(playlist).properties({
      docLang: lang,
      docAuthor: author_uid,
      pattern,
    });
    should.deepEqual(playlist.suttaRefs.map(sr=>sr.sutta_uid), [
      'thig1.1', 'thig1.2', 'thig1.3', ]);
    should.deepEqual(playlist.suttaRefs.map(sr=>sr.lang), [
      lang, lang, lang ]);
    should.deepEqual(playlist.suttaRefs.map(sr=>sr.author), [
      author_uid, author_uid, author_uid ]);
  });
  it("fromCard() error", ()=>{
    let eCaught;
    let pl;

    eCaught = undefined;
    try { pl = Playlist.fromCard(undefined); } 
    catch(e) { eCaught = e; }
    should(eCaught?.message).match(/invalid card context/);

    eCaught = undefined;
    try { 
      pl = Playlist.fromCard({
        context: EbtCard.CONTEXT_SUTTA,
      }); 
    } catch(e) { eCaught = e; }
    should(eCaught?.message).match(/invalid card context/);
  });
  it("serialize", ()=>{
    let index = 1;
    const opts = {
      docLang: 'de',
      docAuthor: 'sabbamitta',
      suttaRefs: TEST_SUTTAREFS,
      pattern: TEST_PATTERN,
    }
    let pl1 = new Playlist(opts);
    pl1.index = index;
    let json = JSON.stringify(pl1, null, 2);
    let pl2 = new Playlist(JSON.parse(json));
    should.deepEqual(pl2.suttaRefs, pl1.suttaRefs);
    should.deepEqual(pl2.docLang, pl1.docLang);
    should.deepEqual(pl2.docAuthor, pl1.docAuthor);
    should.deepEqual(pl2.pattern, pl1.pattern);
    should(pl1.index).equal(pl2.index);
  });
  it("resolvePlaylist() PLAY", async ()=>{
    const msg = "test.playlist@241";
    const dbg = 0;
    let sutta_uid = 'thig1.2';
    let scid = `${sutta_uid}:1.3`;
    let lang = 'en';
    let author = 'soma';
    let pattern = 'thig1.1-5';
    let location = [scid, lang, author, pattern];
    let playlist = new Playlist({
      pattern, 
      docLang:lang, 
      docAuthor:author,
    });
    let sref = SuttaRef.create(location.slice(0,3).join('/'));

    let res = await playlist.resolveLocation(location);

    dbg && console.log(msg, {res});
    should(res).equal(playlist);
    should(playlist.pattern).equal(pattern);
    should(playlist.docLang).equal(lang);
    should(playlist.docAuthor).equal(author);
    should(playlist.index).equal(1);
    should.deepEqual(playlist.cursor, sref);
  });
});
