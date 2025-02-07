
import should from "should";
import { logger } from "log-instance/index.mjs";
logger.logLevel = 'warn';

import { 
  Languages,
  messages,
} from '../src/index.mjs';

(typeof describe === 'function') && describe("audio-store.mjs", function () {
  it("i18n", ()=>{
    should.deepEqual(Languages.VOICE_LANGS, [
      { value: 'de', title: 'DE / Deutsch', voice: true },
      { value: 'en', title: 'EN / English', voice: true },
      { value: 'es', title: 'ES / Español', voice: true },
      { value: 'fr', title: 'FR / Français', voice: true },
      { value: 'it', title: 'IT / Italiano', voice: true },
      { value: 'jpn', title: 'JPN / 日本語', voice: true },
      { value: 'pt', title: 'PT / Português', voice: true },
      { value: 'ru', title: 'RU / Русский', voice: true },
    ]);
    should.deepEqual(Languages.UI_LANGS, [
      { value: 'cs', title: 'CS / Čeština', voice: false },
      { value: 'da', title: 'DA / Dansk', voice: false },    
      { value: 'de', title: 'DE / Deutsch', voice: true },
      { value: 'en', title: 'EN / English', voice: true },
      { value: 'es', title: 'ES / Español', voice: true },
      { value: 'fr', title: 'FR / Français', voice: true },
      { value: 'hi', title: 'HI / हिंदी', voice: false }, 
      { value: 'is', title: 'IS / Íslenska', voice: false },
      { value: 'it', title: 'IT / Italiano', voice: true },
      { value: 'jpn', title: 'JPN / 日本語', voice: true },
      { value: 'nb', title: 'NB / Norsk', voice: false },
      { value: 'nl', title: 'NL / Nederlands', voice: false },
      { value: 'pl', title: 'PL / Polski', voice: false },
      { value: 'pt', title: 'PT / Português', voice: true },
      { value: 'ro', title: 'RO / Română', voice: false },
      { value: 'ru', title: 'RU / Русский', voice: true },
      { value: 'si', title: 'SI / සිංහල', voice: false },
      { value: 'vi', title: 'VI / Tiếng Việt', voice: false },
    ]);
  });
  it("messages", async()=>{
    should(messages).properties([ 'en', 'de', 'pt', 'si', 'jpn' ]);
    should(messages.en.ebt.translation).equal('Translation');
    should(messages.de.ebt.translation).equal('Übersetzung');
  });
})
