import { default as EbtSettings } from "../src/ebt-settings.mjs";
import { default as EbtCard } from "../src/ebt-card.mjs";
import should from "should";
import { mockNavigator } from "./test-utils.mjs";

(typeof describe === 'function') && describe("ebt-settings.mjs", function () {
  it("default ctor en", async () => {
    mockNavigator(['en-US']);
    var ebt = new EbtSettings();
    should(ebt).properties({
      audio: EbtSettings.AUDIO.OGG,
      blockVolume: 2,
      clickVolume: 2,
      docAuthor: 'sujato',
      docLang: 'en',
      fullLine: false,
      ips: 6,
      langTrans: 'en',
      maxPlayMinutes: 30,
      maxResults: 5,
      refAuthor: 'sujato',
      refLang: 'en',
      showId: true,
      showPali: true,
      showReference: false,
      showSutta: true,
      showTrans: true,
      showVinaya: false,
      speakPali: true,
      swooshVolume: 2,
      vnameRoot: 'Aditi',
      vnameTrans: 'Amy',
      //tutorAsk: true,
      //tutorClose: true,
      //tutorPlay: true,
      //tutorSearch: true,
      //tutorSettings: true,
      //tutorWiki: true,

    });
    let keys = Object.keys(ebt);
    should(keys.indexOf('loaded')).equal(-1);
  });
  it("default ctor de-de", async () => {
    try {
      mockNavigator(['de-de']);
      should(global.navigator.languages[0]).equal('de-de');
      let ebt = new EbtSettings();
      should(ebt).properties({
        audio: EbtSettings.AUDIO.OGG,
        fullLine: false,
        ips: 6,
        langTrans: 'de',
        docAuthor: 'sabbamitta',
        maxPlayMinutes: 30,
        maxResults: 5,
        refLang: 'en',
        refAuthor: 'sujato',
        showId: true,
        showPali: true,
        showReference: false,
        showSutta: true,
        showTrans: true,
        showVinaya: false,
        vnameRoot: 'Aditi',
        vnameTrans: 'Vicki',
      });
    } finally {
      mockNavigator(['en-us']);
    }
  });
  it("INITIAL_STATE", async () => {
    should(EbtSettings.INITIAL_STATE).properties({
      audio: 'ogg',
      audioSuffix: 'mp3',
      blockVolume: 2,
      clickVolume: 2,
      docLang: 'en',
      docAuthor: 'sujato',
      fullLine: false,
      id: 1,
      ips: 6,
      langRoot: 'pli',
      langs: 'pli+en',
      langTrans: 'en',
      langTrans: 'en',
      locale: 'en',
      maxDuration: 3*60*60,
      maxPlayMinutes: 30,
      maxResults: 5,
      refLang: 'en',
      refAuthor: 'sujato',
      scid: undefined,
      serverUrl: 'https://www.api.sc-voice.net/scv',
      showGdpr: true,
      showId: true,
      showPali: true,
      showReference: false,
      showTrans: true,
      sutta_uid: undefined,
      swooshVolume: 2,
      theme: 'dark',
      translator: 'sujato',
      //tutorAsk: true,
      //tutorClose: true,
      //tutorPlay: true,
      //tutorSearch: true,
      //tutorSettings: true,
      //tutorWiki: true,
      vnameRoot: 'Aditi',
      vnameTrans: 'Amy',

    });
    let cards = EbtSettings.INITIAL_STATE.cards;
    should(cards instanceof Array);
    should(cards.length).equal(0);
  });
  it("custom ctor", async () => {
    let dates = [
      new Date(2021, 1, 1),
      new Date(2021, 2, 2),
      new Date(2021, 3, 3),
    ];
    let clickVolume = 4;
    let blockVolume = 3;
    let swooshVolume = 1;
    let showId = true;
    let showPali = false;
    var ebt = new EbtSettings({
      clickVolume,
      blockVolume,
      swooshVolume,
      showId,
      showPali,
    });

    should(ebt).properties({
      clickVolume,
      blockVolume,
      swooshVolume,
      showId,
      showPali,
    });
  });
  it("REF_LANGUAGES => reference languages", () => {
    should.deepEqual(EbtSettings.REF_LANGUAGES.map(tl => tl.code).sort(), [
      'de',
      'en',
    ]);
  });
  it("TRANS_LANGUAGES => translation languages", () => {
    should.deepEqual(EbtSettings.TRANS_LANGUAGES.map(tl => tl.code).sort(), [
      'cs',
      'de',
      'en',
      'es',
      'fr',
      'it',
      'ja',
      'pt',
      'ru',
    ]);
  });
  it("segmentRef()", ()=>{
    let langTrans = 'de';
    let author = 'sabbamitta';
    let settings = new EbtSettings({langTrans});
    let segnum = '1.0';
    should(EbtSettings.segmentRef("thig1.1", settings)).properties({
      sutta_uid: 'thig1.1',
      lang: langTrans,
      author, 
      segnum,
    });
    should(EbtSettings.segmentRef("thig1.1:2.3/en/soma", settings)).properties({
      sutta_uid: 'thig1.1',
      lang: 'en',
      author: 'soma', 
      segnum: '2.3',
    });
    should(EbtSettings.segmentRef("thig1.1:2.3/en", settings)).properties({
      sutta_uid: 'thig1.1',
      lang: 'en',
      author: 'sujato', 
      segnum: '2.3',
    });
    should(EbtSettings.segmentRef("thig1.1:2.3/pli", settings)).properties({
      sutta_uid: 'thig1.1',
      lang: 'pli',
      author: 'ms', 
      segnum: '2.3',
    });
  });
  it("validate() de", ()=>{
    let state = {
      langTrans: 'de',
      docLang: 'en',
      docAuthor: 'sujato',
      vnameTrans: 'Amy',
      refAuthor: 'sujato',
      refLang: 'pt',
      speakPali: false,
      speakTrans: false,
      showPali: false,
      showTranslation: false,
      showReference: false,
    }
    let res = EbtSettings.validate(state);
    should(res.isValid).equal(true);
    should(!!res.error).equal(false);
    should.deepEqual(res.changed, {
      docAuthor: 'sabbamitta',
      docLang: 'de',
      playEnd: EbtSettings.END_STOP,
      refAuthor: 'laera-quaresma',
      showPali:true, 
      showSutta: true,
      showVinaya: false,
      speakPali:true, 
      vnameTrans:'Vicki',

    });
  });
  it("validate() jpn", ()=>{
    let state = {
      langTrans: 'jpn',
      vnameTrans: 'Amy',
      speakPali: false,
      speakTrans: false,
      showPali: false,
      showTranslation: false,
      showReference: false,
    }
    let res = EbtSettings.validate(state);
    should(res.isValid).equal(true);
    should(!!res.error).equal(false);
    should.deepEqual(res.changed, {
      playEnd: EbtSettings.END_STOP,
      docAuthor: 'kaz',
      docLang: 'jpn',
      refAuthor: 'sujato',
      refLang: 'en',
      showPali:true, 
      showSutta: true,
      showVinaya: false,
      speakPali:true, 
      vnameTrans:'Takumi',

    });
    should.deepEqual(state, {
      docAuthor: 'kaz',
      docLang: 'jpn',
      langTrans: 'jpn',
      playEnd: EbtSettings.END_STOP,
      refAuthor: 'sujato',
      refLang: 'en',
      showPali: true,
      showReference: false,
      showSutta: true,
      showTranslation: false,
      showVinaya: false,
      speakPali: true,
      speakTrans: false,
      vnameTrans:'Takumi',

    });

    should.deepEqual(EbtSettings.validate(state), {
      isValid: true,
      changed: null,
      error: null,
    });
  });

  it("trilingualPattern()", ()=>{
    let docLang = 'test-docLang';
    let docAuthor = 'test-docAuthor';
    let refLang = 'test-refLang';
    let refAuthor = 'test-refAuthor';
    let settings = { docLang, docAuthor, refLang, refAuthor };
    let pat1 = 'thig1.1, thig1.2';

    should(EbtSettings.trilingualPattern(settings, pat1, true))
    .equal(
      [
        pat1,
        `-dl ${docLang}`,
        `-da ${docAuthor}`,
        `-rl ${refLang}`,
        `-ra ${refAuthor}`,
        '-ml1',
      ].join(' '), 
    );

    let pat2 = `${pat1} -dl en -da soma`;
    should(EbtSettings.trilingualPattern(settings, pat2, true))
    .equal(
      [
        pat2,
        `-rl ${refLang}`,
        `-ra ${refAuthor}`,
        '-ml1',
      ].join(' '), 
    );

    let pat3 = `${pat1} -rl en -ra soma`;
    should(EbtSettings.trilingualPattern(settings, pat3, true))
    .equal(
      [
        pat3,
        `-dl ${docLang}`,
        `-da ${docAuthor}`,
        '-ml1',
      ].join(' '), 
    );

    let pat4 = `${pat1} -da soma`;
    should(EbtSettings.trilingualPattern(settings, pat4, true))
    .equal(
      [
        pat4,
        `-dl ${docLang}`,
        `-rl ${refLang}`,
        `-ra ${refAuthor}`,
        '-ml1',
      ].join(' '), 
    );

    let pat5 = `${pat1} -ra soma`;
    should(EbtSettings.trilingualPattern(settings, pat5, true))
    .equal([
      pat5,
      `-dl ${docLang}`,
      `-da ${docAuthor}`,
      `-rl ${refLang}`,
      '-ml1',
    ].join(' '));
  });

});
