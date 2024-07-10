<template>
  <v-sheet v-if="findResult" class="">
    <v-autocomplete 
      v-model="search" 
      :append-icon="search ? 'mdi-magnify' : ''"

      :id="`${card.id}-search`"
      variant="underlined"
      :items="history"
      :label="$t('ebt.searchPaliDictionary')"
      :placeholder="$t('ebt.enterPaliWordOrDefinition')"
      class="search-field"
      clearable
      @update:search="updateSearch"
      @keyup.enter="onEnter($event)"
      hide-no-data
    />
    <!--
      @focus="onFocus"
      @click:append="onSearch"
      @click:clear="onSearchCleared($event, card)"
      :hint="$t('auth.required')"
      :filter="searchFilter"
    -->
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
        search: ref(),
        items: ref([...history.value]),
        history,
      }
    },
    components: {
    },
    methods: {
      updateHistory(value) {
        const msg = "PaliView.updateHistory()";
        const dbg = DBG.PALI_SEARCH;
        let iExisting = history.value.indexOf(value);
        if (iExisting < 0) {
          msg && console.log(msg, '[1]add', value);
          history.value.unshift(value);
          while (history.value.length > MAX_HISTORY) {
            msg && console.log(msg, '[2]pop', value);
            history.value.pop();
          }
        } else {
          msg && console.log(msg, '[3]existing', value);
        }
      },
      onEnter(evt) {
        const msg = "PaliView.onEnter()";
        const dbg = DBG.PALI_SEARCH;
        let { search, volatile } = this;
        let { dictionary:dict } = volatile;
        let entry = search && dict.entryOf(search);
        if (!entry) {
          msg && console.log(msg, '[1]search?', search);
          return;
        }
        msg && console.log(msg, '[2]entry', search, entry);
        this.updateHistory(search);
      },
      updateSearch(value) {
        const msg = "PaliView.updateSearch()";
        const dbg = DBG.PALI_SEARCH;
        let { search, volatile } = this;
        let { dictionary:dict } = volatile;
        let entry = value && dict.entryOf(value);
        if (entry && history.value.indexOf(value)<0) {
          history.value.unshift(value);
        }
        this.items.value = [value, ...history.value];
        dbg && console.log(msg, this.items.value, entry);
        return value;
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
        switch (type) {
          case 'masc': return 'masculine';
          case 'fem': return 'feminine';
          case 'adj': return 'adjective';
          case 'nt': return 'neuter';
          default: return type;
        }
      },
    },
    async mounted() {
      const msg = 'PaliView.mounted()';
      let dbg = DBG.PALI_VIEW;
      let { card, $route, settings, volatile} = this;

      dbg && console.log(msg, '[1]');
      let { dictionary } = volatile;
      if (dictionary == null) {
        dictionary = await Dictionary.create();
        dbg && console.log(msg, '[2]dictionary', dictionary);
        volatile.dictionary = dictionary;
      }

      let word = card.location[0].toLowerCase();
      let res = dictionary.find(word);
      this.findResult = res;

      card.onAfterMounted({settings, volatile});
    },
    computed: {
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
        let { card, volatile } = this;
        let { dictionary } = volatile;
        if (dictionary == null) {
          return [ '...', '...', '...', '...' ];
        }

        let word = card.location[0].toLowerCase();
        let entry = dictionary.entryOf(word);
        let res = dictionary.find(word);
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
