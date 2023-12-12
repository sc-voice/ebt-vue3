<template>
  <v-sheet class="ebt-wiki-sheet">
    <div v-html="volatile.homeHtml" />
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { logger } from 'log-instance/index.mjs';
  import { 
    DEBUG_MOUNTED, DEBUG_HOME, DEBUG_WIKI 
  } from '../defines.mjs';
  import { ref } from "vue";

  export default {
    inject: ['config'],
    setup() {
      return {
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
      }
    },
    props: {
      card: { type: Object, required: true, },
    },
    components: {
    },
    methods: {
    },
    async mounted() {
      const msg = "HomeView.unmounted() ";
      const dbg = DEBUG_MOUNTED || DEBUG_WIKI;
    },
    async mounted() {
      const msg = "HomeView.mounted() ";
      const dbg = DEBUG_HOME || DEBUG_MOUNTED || DEBUG_WIKI;
      let { card, $route, volatile, settings } = this;
      let { langTrans } = settings;
      let { fullPath } = $route;
      let { id, location } = card;
      dbg && console.log(msg, '[1]fetchWikiHtml', {location});
      await volatile.fetchWikiHtml(card);
      dbg && console.log(msg, '[2]fetchWikiHtml', card.location);

      card.onAfterMounted({settings, volatile});
    },
    computed: {
    },
  }
</script>

<style >
</style>

