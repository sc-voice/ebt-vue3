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
          <th>Construction</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(def,i) in definitions">
          <td>{{i+1}}&nbsp;{{def[0]}}</td>
          <td>{{def[1]}}</td>
          <td>{{def[2]}}</td>
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
      definitions() {
        let { card, volatile } = this;
        let { dictionary } = volatile;
        if (dictionary == null) {
          return [ '...', '...', '...' ];
        }

        let word = card.location[0].toLowerCase();
        let entry = dictionary.entryOf(word);
        let definitions = ['nothing'];
        if (entry) {
          definitions = entry.definition;
          definitions = entry.definition.map(def=>{
            let [ gender, text, derivation ] = def.split(/<.?b>/);
            derivation = derivation
              .replace(/[\[\]√]/g, '')
              .replace(/ \+ /, '\u02D6');
            return [ gender.trim(), text.trim(), derivation.trim() ];
          });
        } else {
          let gender = '--';
          let text = `${word} not found`;
          let derivation = '--';
          definitions = [ gender, text, derivation ];
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
.dict th {
  font-size: smaller;
}
.dict tr:hover > td{
}
</style>
