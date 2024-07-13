<template>
  <v-sheet class="">
    <v-expand-x-transition >
      <v-autocomplete  v-if="showSearch"
        v-model="search" 
        transition="expand-x-transition"
        :appendInner-icon="search ? 'mdi-open-in-new' : ''"

        :id="`${card.id}-search`"
        variant="underlined"
        :placeholder="$t('ebt.enterPaliWordOrDefinition')"
        class="search-field"
        hide-no-data
        :items="history"
        min-width="350px"
        autofocus

        @update:search="updateSearch"
        @update:modelValue="updateModelValue"
        @keyup.enter="onEnter"
        @click:appendInner="clickAppend"
      />
    </v-expand-x-transition>
    <div v-if="findResult" class="dict" >
      <div v-for="(group,ig) in defGroups">
        <div class="dict-group">
          <div class="dict-group-title">
            {{ig+1}}
            <a :href="`#/pali/${group.word}`" tabindex=-1>
              {{group.word}} 
            </a>
            <span v-if="group.construction" class="dict-construction">
              {{group.construction}}
            </span>
          </div>
          <div class="dict-menu">
            <v-btn icon="mdi-play"
              @click="clickPlay(group)"
            ></v-btn>
          </div>
        </div><!-- dict-group -->
        <audio v-if="showAudio(group)"
          :id="`${group}-audio`"
          controls :src="urlPaliAudio"
          autoplay
        ></audio>
        <table>
          <tr v-for="(def,i) in groupDefinitions(group)">
            <td :title="typeTitle(def.type)">
              {{String.fromCharCode(0x2460+i)}}&nbsp;{{def.type}}
            </td>
            <td title="Meaning" v-html="meaningHtml(def)"
            ></td>
          </tr>
        </table>
      </div><!-- group -->
    </div><!-- dict -->
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { ref, nextTick } from "vue";
  import { DBG, } from '../defines.mjs';
  import { default as EbtCard } from '../ebt-card.mjs';
  import { 
    Dictionary,
    Pali,
  } from "@sc-voice/pali";
  const MAX_HISTORY = 7;
  const MAX_DEFINITIONS = 100;
  const history = ref([]);

  export default {
    inject: ['config'],
    props: {
      card: {
        type: Object,
      },
    },
    setup() {
      const settings = useSettingsStore();
      const volatile = useVolatileStore();
      return {
        settings,
        volatile,
      }
    },
    data: () => {
      const findResult = ref();
      return {
        findResult,
        search: undefined,
        showInNewCard: false,
        history,
        urlPaliAudio: undefined,
        playGroup: undefined,
      }
    },
    components: {
    },
    methods: {
      showAudio(group) {
        const msg = "PaliView.showAudio";
        const dbg = DBG.PALI_VIEW;
        let { playGroup } = this;
        dbg && console.log(msg, group, playGroup);
        return playGroup &&
          group.word===playGroup.word && 
          group.construction===playGroup.construction;
      },
      async clickPlay(group) {
        const msg = "PaliView.clickPlay()";
        const dbg = DBG.PALI_VIEW;
        let { settings } = this;
        let { word } = group;
        let urlPlay = [
          settings.serverUrl,
          'dictionary',
          'en',
          'dpd',
          word,
          'Aditi',
          'Amy',
        ].join('/');
        this.urlPaliAudio = null;
        this.playGroup = null;
        let res = await fetch(urlPlay);
        if (!res.ok) {
          console.err(msg, res);
          return;
        }
        let json = await res.json();
        let { paliGuid } = json;
        let urlPaliAudio = [
          settings.serverUrl,
          'audio',
          'dpd',
          'pli',
          'dpd',
          'Aditi',
          paliGuid,
        ].join('/')
        this.urlPaliAudio = urlPaliAudio;
        this.playGroup = group;
        dbg && console.log(msg, word, urlPlay, paliGuid, urlPaliAudio);
      },
      clickAppend(evt) {
        const msg = "PaliView.clickAppend()";
        const dbg = DBG.PALI_VIEW;
        let { search } = this;
        dbg && console.log(msg, search);
      },
      meaningHtml(def) {
        const msg = "PaliView.meaningHtml()";
        const dbg = 1;
        let { literal, meaning } = def;
        let { findResult } = this;
        if (findResult) {
          let { method, pattern } = findResult;
          if (method === 'definition') {
            let re = new RegExp(pattern, 'ig');
            meaning = meaning && meaning.replace(re, 
              `<span class="dict-pat">${pattern}</span>`
            );
            literal = literal && literal.replace(re, 
              `<span class="dict-pat">${pattern}</span>`
            );
          }
        }
        let result = meaning;
        if (literal) {
          result += `; <i>lit. ${literal}</i>`;
        }
        return result;
      },
      runSearch(opts={}) {
        const msg = "PaliView.runSearch()";
        const dbg = DBG.PALI_SEARCH;
        let { 
          search=this.search, openNew
        } = opts;
        let { card, dict, config, settings } = this;
        let { maxDefinitions=MAX_DEFINITIONS } = config;
        let res = search && dict.find(search);
        if (!res) {
          dbg && console.log(msg, '[2]search?', search);
          return;
        }

        let iExisting = history.value.indexOf(search);
        if (iExisting < 0) {
          dbg && console.log(msg, '[2]history+', search);
          history.value.unshift(search);
          while (history.value.length > MAX_HISTORY) {
            let discard = history.value.pop();
            dbg && console.log(msg, '[3]history-', discard);
          }
          dbg && console.log(msg, '[4]res', res);
        }

        if (maxDefinitions && res.data.length>maxDefinitions) {
          res.data = res.data.slice(0,maxDefinitions);
          Object.assign(res.data[maxDefinitions-1], {
            meaning:"\u2026",
          });
        }
        if (!openNew) {
          this.findResult = res;
          this.search = search;
          this.card.location[0] = search;
          for (let i=settings.cards.length; i-->0;) {
            let c = settings.cards[i];
            if (c.context !== EbtCard.CONTEXT_PALI) {
              continue;
            }
            if (c.id === card.id || c.location[0] !== search) {
              continue;
            }
            dbg && console.log(msg, '[5]removeCard', c);
            settings.removeCard(c, config);
          }
          settings.saveSettings();
        }
        window.location.hash = `#/${card.context}/${search}`;
      },
      updateModelValue(value) { // dropdown update
        const msg = "PaliView.updateModelValue()";
        const dbg = DBG.PALI_SEARCH;
        dbg && console.log(msg, value);
        this.runSearch({search:value});
      },
      updateSearch(value) { // keyboard update
        const msg = "PaliView.updateSearch()";
        const dbg = DBG.PALI_SEARCH;
        let { search, dict } = this;
        let entry = value && dict.entryOf(value);
        this.search = value;

        if (entry && history.value.indexOf(value)<0) {
          dbg && console.log(msg, '[1]valid', {search, value, entry});
        }
      },
      onEnter(evt) {
        const msg = "PaliView.onEnter()";
        const dbg = DBG.PALI_SEARCH;
        let { dict, search, volatile } = this;
        let res = search && dict.find(search);
        if (!res) {
          msg && console.log(msg, '[1]search?', search, evt);
          return;
        }
        let { ctrlKey } = evt;
        let openNew = ctrlKey;
        msg && console.log(msg, '[2]entry', search, res, evt);
        this.runSearch({search, openNew});
        volatile.paliSearchCard = null;
      },
      groupDefinitions(group) {
        const msg = "PaliView.groupDefinitions()";
        let { word, construction } = group;
        let { findResult } = this;
        let { method, pattern, data } = findResult;
        return data.filter(d=>{
          return d.word === group.word && 
            d.construction===group.construction;
        });
      },
      typeTitle(type) {
        let info = Dictionary.ABBREVIATIONS[type];
        return info && info.meaning || type;
      },
    },
    async mounted() {
      const msg = 'PaliView.mounted()';
      let dbg = DBG.PALI_VIEW;
      let { dict, card, $route, settings, volatile} = this;

      dbg && console.log(msg, '[1]');
      if (dict == null) {
        dict = await Dictionary.create();
        dbg && console.log(msg, '[2]dictionary', dict);
        volatile.dictionary = dict;
      }

      let word = card.location[0];
      if (word) {
        word = word.toLowerCase();
        let res = dict.find(word);
        dbg && console.log(msg, '[3]find', word);
        this.findResult = res;
      } else {
        dbg && console.log(msg, '[4]search');
        volatile.paliSearchCard = card;
      }

      card.onAfterMounted({settings, volatile});
    },
    computed: {
      showSearch() {
        let { card, volatile } = this;
        return card === volatile.paliSearchCard;
      },
      dict() {
        return this.volatile.dictionary;
      },
      word() {
        return this.card.location[0];
      },
      defGroups() {
        const msg = "PaliView.defGroups()";
        let { definition, findResult } = this;
        let { data } = findResult;
        let dPrev = null;

        return data.reduce((a,d) => {
          let { word, construction } = d;
          word = word.toLowerCase();
          construction = construction && construction.toLowerCase();
          if (word !== dPrev?.word ||
              construction !== dPrev?.construction) 
          {
            a.push({word, construction});
          }
          dPrev = d;
          return a;
        }, []);
      },
      definition() {
        let { card, dict } = this;
        if (dict == null) {
          return [ '...', '...', '...', '...' ];
        }

        let word = card.location[0].toLowerCase();
        let entry = dict.entryOf(word);
        let res = dict.find(word);
        let definitions = ['nothing'];
        if (entry) {
          definitions = entry.definition;
          definitions = entry.definition.map(def=>def.split('|'));
        } else {
          let type = '--';
          let meaning = `${word} not found`;
          let literal = '--';
          let construction = '--';
          definitions = [ type, meaning, literal, construction ];
        }
        return definitions;
      },
    },
  }
</script>

<style>
.dict td {
  padding: 0.2em;
  padding-left: 0.5em;
}
.dict tr .dict-menu {
  opacity: 0.1;
  font-weight: 600;
}
.dict tr:hover .dict-menu {
  opacity: 1;
}
@media (max-width: 600px) {
  .dict tr .dict-menu {
    opacity: 1;
  }
}
.dict-pat {
  color: rgb(var(--v-theme-matched));
}
.dict-construction {
  padding-left: 1em;
  font-size: smaller;
  font-style: italic;
}
.dict-search {
  display: flex;
  flex-flow: column;
  align-items: center;
  width: 100%;
}
.dict-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.7em;
  border-bottom: 1pt solid rgba(var(--v-theme-on-surface),0.3);
}
.dict-group-title {
}
.dict-group:hover .dict-menu {
  color: rgb(var(--v-theme-link));
}
</style>
