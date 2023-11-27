<template>
  <v-sheet class="wikihome">
    <div v-html="volatile.homeHtml" />
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { logger } from 'log-instance/index.mjs';
  import { DEBUG_WIKI } from '../defines.mjs';
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
      const msg = "HomeView.mounted() ";
      let { card, $route, volatile, settings } = this;
      let { langTrans } = settings;
      let { fullPath } = $route;
      let { id, location } = card;
      let dbg = settings.development && (DEBUG_WIKI);
      dbg && console.log(msg, '[1]fetchWikiHtml', {location});
      await volatile.fetchWikiHtml(location, msg);
      dbg && console.log(msg, '[2]fetchWikiHtml', {location});
      card.onAfterMounted({settings, volatile});
    },
    computed: {
    },
  }
</script>

<style >
</style>

