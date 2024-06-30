<template>
  <v-sheet v-if="volatile.dictionary" class="">
    <v-table 
      density="compact" 
      hover
      class="dict"
    >
      <thead>
        <tr>
          <th>Type</th>
          <th>Definition</th>
        </tr>
      </thead>
      <tbody v-for="(group,ig) in defGroups">
        <tr>
          <th colspan=3>{{word}} {{ig+1}} [{{group}}]</th>
        </tr>
        <tr v-for="(def,i) in groupDefinitions(group)">
          <td>&nbsp;{{ig+1}}.{{i+1}}&nbsp;{{def[0]}}</td>
          <td>{{def[1]}}</td>
          <td>{{def[2] && ('lit.'+def[2]) || '\u00a0'}}</td>
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
  import { 
    Dictionary,
    Pali,
  } from "@sc-voice/pali";
  const msg = "PaliView.";
  const entry = ref();

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
      return {
      }
    },
    components: {
    },
    methods: {
      groupDefinitions(group) {
        let { card, volatile } = this;
        let { dictionary } = volatile;
        if (dictionary == null) {
          return [ '...', '...', '...', '...' ];
        }

        let word = card.location[0].toLowerCase();
        let entry = dictionary.entryOf(word);
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
        return definitions.filter(d=>d[3] === group);
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

      card.onAfterMounted({settings, volatile});
    },
    computed: {
      word() {
        return this.card.location[0];
      },
      defGroups() {
        let {definitions} = this;
        return definitions.reduce((a,d)=>{
          let [ type, meaning, literal, construction ] = d;
          if (construction != a[a.length-1]) {
            a.push(construction);
          }
          return a;
        }, []);
      },
      definitions() {
        let { card, volatile } = this;
        let { dictionary } = volatile;
        if (dictionary == null) {
          return [ '...', '...', '...', '...' ];
        }

        let word = card.location[0].toLowerCase();
        let entry = dictionary.entryOf(word);
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
  font-size: larger;
}
</style>
