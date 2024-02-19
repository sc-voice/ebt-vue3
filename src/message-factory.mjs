import { default as Languages } from "./languages.mjs"
import { default as EbtSettings } from './ebt-settings.mjs'

var MESSAGES;

export default class MessageFactory {
  static get MESSAGES() { 
    return (async () => {
      if (MESSAGES == null) {
        MESSAGES = {};
        let { UI_LANGS } = Languages;
        for (let i = 0; i < UI_LANGS.length; i++) {
          let { value:lang } = UI_LANGS[i];
          let scLang = EbtSettings.scLang(lang);
          let fname = `./i18n/${scLang}.mjs`;
          let langInfo = await import(fname /* @vite-ignore */);
          MESSAGES[scLang] = langInfo.default;
        }
      }
      return MESSAGES; 
    })();
  }

}

