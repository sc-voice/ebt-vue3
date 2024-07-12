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
    <v-table 
      v-if="findResult"
      density="compact" 
      hover
      class="dict"
    >
      <tbody v-for="(group,ig) in defGroups">
        <tr>
          <th colspan=3>
            {{ig+1}} 
            <a :href="`#/pali/${group.word}`">
              {{group.word}} 
            </a>
            <span v-if="group.construction" class="dict-construction">
              {{group.construction}}
            </span>
          </th>
        </tr>
        <tr v-for="(def,i) in groupDefinitions(group)">
          <td :title="typeTitle(def.type)">
            &nbsp;{{String.fromCharCode(0x2460+i)}}&nbsp;{{def.type}}
          </td>
          <td title="Meaning" v-html="meaningHtml(def)"></td>
        </tr>
      </tbody>
    </v-table>
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
      }
    },
    components: {
    },
    methods: {
      clickAppend(evt) {
        const msg = "PaliView.clickAppend()";
        const dbg = DBG;
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
          result += `<i>lit. ${literal}</i>`;
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
.dict td,
.dict th {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  padding-left: 8px !important;
  padding-right: 8px !important;
  max-width: 300px;
  vertical-align: top;
}
.dict thead th {
  font-size: smaller;
}
.dict tbody tr:hover > td{
}
.dict tbody th {
  font-weight: 600;
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
</style>
