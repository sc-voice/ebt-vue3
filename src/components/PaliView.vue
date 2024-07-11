<template>
  <v-sheet v-if="findResult" class="">
    search:{{search}}
    <v-autocomplete 
      v-model="search" 
      :append-icon="search ? 'mdi-magnify' : ''"

      :id="`${card.id}-search`"
      variant="underlined"
      :label="$t('ebt.searchPaliDictionary')"
      :placeholder="$t('ebt.enterPaliWordOrDefinition')"
      class="search-field"
      hide-no-data
      clearable
      :items="history"

      @update:search="updateSearch"
      @update:modelValue="updateModelValue"
      @keyup.enter="onEnter($event)"
    />
    <div>find: {{findResult.pattern}}</div>
    <div>method: {{findResult.method}}</div>
    <v-table 
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
            &nbsp;{{ig+1}}.{{i+1}}&nbsp;{{def.type}}
          </td>
          <td title="Meaning">{{def.meaning}} 
            <i v-if="def.literal">lit. {{def.literal}}</i>
          </td>
        </tr>
      </tbody>
    </v-table>
  <!--
  -->
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { ref, nextTick } from "vue";
  import { DBG, } from '../defines.mjs';
  import { 
    Dictionary,
    Pali,
  } from "@sc-voice/pali";
  const MAX_HISTORY = 7;
  const history = ref([
    "dhamma",
    "saṁvega",
    "moral virtue",
  ]);

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
        search: null,
        history,
      }
    },
    components: {
    },
    methods: {
      runSearch(search=this.search) {
        const msg = "PaliView.runSearch()";
        const dbg = DBG.PALI_SEARCH;
        let { dict } = this;
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

        // TODO update results
      },
      updateModelValue(value) { // dropdown update
        const msg = "PaliView.updateModelValue()";
        const dbg = DBG.PALI_SEARCH;
        dbg && console.log(msg, value);
        this.runSearch(value);
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
          msg && console.log(msg, '[1]search?', search);
          return;
        }
        msg && console.log(msg, '[2]entry', search, res);
        this.runSearch(search);
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

      let word = card.location[0].toLowerCase();
      let res = dict.find(word);
      this.findResult = res;

      card.onAfterMounted({settings, volatile});
    },
    computed: {
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
          construction = construction.toLowerCase();
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
}
.dict thead th {
  font-size: smaller;
}
.dict tbody tr:hover > td{
}
.dict tbody th {
  font-weight: 600;
}
.dict-construction {
  padding-left: 1em;
  font-size: smaller;
  font-style: italic;
}
</style>
