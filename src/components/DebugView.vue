<template>
  <v-sheet class="debug-card" >
    <h4>searchResultMap</h4>
    <v-list>
      <v-list-item v-for="key in searchMapKeys" :key="key"
        :title="key"
        :subtitle="searchMapValue(key)"
      ></v-list-item>
    </v-list>

    <h4>Display {{volatile.displayBox}}</h4>

    <h4 class="mt-4">Test touch</h4>
    <div class="test-touch" >
      TOUCH-ME
      collapseAppBar {{volatile.collapseAppBar}}
    </div>

    <h4 class="mt-4">Links</h4>
    <div style="width: 20em">
      <div v-for="link in testLinks">
        <a :href="link">{{link.replace(/#/,'')}}</a>
      </div>
    </div>
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { default as IdbAudio } from '../idb-audio.mjs';
  import { SuttaRef } from 'scv-esm';
  import { logger } from 'log-instance/index.mjs';
  import { ref } from "vue";

  export default {
    setup() {
      return {
        settings: useSettingsStore(),
        audio: useAudioStore(),
        volatile: useVolatileStore(),
        message: ref(''),
      }
    },
    components: {
    },
    methods: {
      searchMapValue(key) {
        let { volatile } = this;
        let value = volatile.searchResultMap[key] || {
          mlDocs: [{
            uid: "(no-mlDocs?)",
          }],
        };
        return value.mlDocs.map(mld=>{
          let { sutta_uid, lang, author_uid } = mld;
          return `${sutta_uid}/${lang}/${author_uid}`;
        }).join(", ");
      },
      updateMessage(msg) {
        this.message = msg;
        logger.info(msg);
      },
    },
    mounted() {
    },
    computed: {
      searchMapKeys: (ctx) => {
        let { volatile } = ctx;
        return Object.keys(volatile.searchResultMap);
      },
      testLinks: (ctx) => [
        "#/debug",
        "#/",
        "#/wiki",
        "#/sutta",
        "#/sutta/sn24.11:3.1",
        "#/sutta/mn44:0.1",
        "#/sutta/mn44:10.2",
        "#/sutta/mn44:20.1",
        "#/search",
        "#/search/DN33",
        "#/wiki/welcome",
        "#/wiki/about",
        "#/sutta/DN33",
        "#/search/root%20of%20suffering",
      ],
    },
  }
</script>

<style scoped>
.debug-card {
  max-width: 40em;
  margin-left: auto;
  margin-right: auto;
}
.buttons {
  display: flex;
  flex-flow: column;
}
.buttons .v-btn {
  margin: 0.5em;
}
.test-touch {
  width: 100%;
  height: 3em;
  border: 1pt solid red;
}
</style>

