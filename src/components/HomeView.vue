<template>
  <v-sheet class="ebt-wiki-sheet">
    <div v-html="volatile.homeHtml" id="ebt-wiki-html" 
      @focusin.stop.prevent="onFocusIn"
    ></div>
  </v-sheet>
</template>

<script>
  import { default as Utils } from '../utils.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { logger } from 'log-instance/index.mjs';
  import { 
    DBG_MOUNTED, DBG_HOME, DBG_WIKI, 
    DBG_FOCUS, DBG_CLICK, DBG_VERBOSE,
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
      onFocusIn(evt) {
        const msg = "HomeView.onFocusIn()";
        const dbg = DBG_FOCUS;
        let { settings, volatile, card } = this;
        let { target } = evt;
        let viewportElt = card.viewportElement(target);
        if (target.nodeName === "A") {
          dbg && console.log(msg, '[1]appFocus', {evt});
          volatile.appFocus = target;
          if (!Utils.elementInViewport(viewportElt)) {
            dbg && console.log(msg, '[1]scrollToElement', viewportElt);
            settings.scrollToElement(viewportElt);
          }
        }
      },
    },
    async mounted() {
      const msg = "HomeView.mounted() ";
      const dbg = DBG_HOME || DBG_MOUNTED || DBG_WIKI;
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

