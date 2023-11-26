<template>
  <v-sheet id="ebt-cards" 
    color="background" :class="cardsClass" 
    v-touch="{
      left: ()=>onSwipe('left'),
      right: ()=>onSwipe('right'),
    }"
  >
    <div v-for="card in settings.cards">
      <ebt-card-vue 
        :card="card" 
        :routeCard="volatile.routeCard"
        @focusin="onFocusIn(card)"
      />
    </div><!-- v-for card -->
    <sutta-player :routeCard="volatile.routeCard" />
  </v-sheet>
</template>

<script>
  import { ref, nextTick } from "vue";
  import { SuttaRef } from 'scv-esm';
  import { default as HomeView } from './HomeView.vue';
  import { default as EbtCard } from '../ebt-card.mjs';
  import { default as EbtCardVue } from './EbtCard.vue';
  import { default as SuttaPlayer } from './SuttaPlayer.vue';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useSuttasStore } from '../stores/suttas.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { logger } from "log-instance/index.mjs";
  import { DEBUG_FOCUS, DEBUG_SCROLL } from '../defines.mjs';

  export default {
    setup() {
      return {
        audio: useAudioStore(),
        suttas: useSuttasStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
      }
    },
    mounted() {
      let msg = 'EbtCards.mounted() ';
      let { settings, volatile, $route }  = this;

      let { params, path='/home' }  = $route;
      let { cards, debugScroll } = settings;
      let dbg = DEBUG_SCROLL;
      if (path === "/" ) {
        path = "/home"
      }
      let card = settings.pathToCard(path);

      dbg && console.log(msg, '[1]', {$route}, card?.id);

      if (card == null) {
        dbg && console.warn(msg+"[2]UNEXPECTED", {$route, path});
      } else {
        let { activeElement } = document;
        volatile.setRoute(card, true, msg);
        nextTick(() => {
          volatile.setRoute(card, true);
          settings.scrollToCard(card);
          this.bindAudioSutta(window.location.hash);
          dbg && console.log(msg, '[3]', {card, activeElement});
        });
      }
    },
    methods: {
      onSwipe(dir) {
        const msg = "EbtCards.onSwipe()";
        let { audio, volatile } = this;
        let collapseAppBar = volatile.collapseAppBar;
        //console.log(msg, {dir});
        volatile.touchSwipe = dir;
        switch (dir) {
          case 'left': 
            collapseAppBar = false;
            break;
          case 'right': 
            collapseAppBar = true;
            break;
        }
        if (collapseAppBar !== volatile.collapseAppBar) {
          audio.playSwoosh();
          volatile.collapseAppBar = collapseAppBar;
        }
      },
      onFocusIn(card) {
        const msg = "EbtCards.onFocusIn() ";
        let { volatile, settings } = this;
        let { cards } = settings;
        let { context, location } = card;
        let routeHash = window.location.hash;
        let routeCard = EbtCard.pathToCard({
          path: routeHash,
          cards, 
          addCard: (opts) => {},
          defaultLang: settings.langTrans,
        });
        if (routeCard !== card) {
          volatile.setRoute(card.routeHash(), true, msg);
        }
      },
      async bindAudioSutta(route) {
        let { volatile, suttas, audio, settings, } = this;
        let { routeCard } = volatile;
        if (routeCard?.context === EbtCard.CONTEXT_SUTTA) {
          let suttaRef = EbtCard.routeSuttaRef(route, settings.langTrans);
          let idbSuttaRef = await suttas.getIdbSuttaRef(suttaRef);
          let idbSutta = idbSuttaRef.value;
          let { sutta_uid, segnum } = suttaRef;
          let { segments } = idbSutta;
          let incRes = routeCard.incrementLocation({segments, delta:0});
          let { iSegment=0 } = incRes || {};
          audio.setAudioSutta(idbSutta, iSegment);
        } else {
          audio.setAudioSutta(null);
        }
      },
      routeScid(route) {
        let { sutta_uid, segnum } = this.routeSuttaRef(route);
        return segnum ? `${sutta_uid}:${segnum}` : sutta_uid;
      },
    },
    computed: {
      cardsClass(ctx) {
        let { settings } = ctx;
        return settings.cardsOpen === 1 
          ? "ebt-cards ebt-cards1" 
          : "ebt-cards";
      },
    },
    watch:{
      $route (to, from) {
        const msg = 'EbtCards.watch.$route';
        let { volatile, settings, $route }  = this;
        let { cards, debugScroll, debugFocus } = settings;
        let dbg = DEBUG_SCROLL || DEBUG_FOCUS;
        let card = EbtCard.pathToCard({
          path: to.fullPath, 
          cards, 
          addCard: (opts) => settings.addCard(opts),
          defaultLang: settings.langTrans,
        });
        let { activeElement } = document;
        dbg && console.log(msg, '[1]setRoute', {activeElement, to, from});
        volatile.setRoute(card, undefined, msg);
        dbg && console.log(msg, '[2]setRoute', document.activeElement);
        this.bindAudioSutta(to.href);
        if (card == null) {
          volatile.setRoute('', undefined, msg);
          console.warn(msg, `[3]non-card route`, {$route, to, from});
          return;
        }

        if (card.isOpen) {
          dbg && console.log(msg, `[4]card`, {$route, to, from, card});
        } else {
          card.isOpen = true;
          dbg && console.log(msg, `[5]opened card`, 
            {$route, to, from, card});
        }
        if (card.context === EbtCard.CONTEXT_WIKI) {
          volatile.fetchWikiHtml(card.location, msg);
        }
        nextTick(() => { 
          let { ebtChips } = volatile;
          let { fullPath } = to;
          if (ebtChips !== activeElement) {
            dbg && console.log(msg, '[6]focus', {fullPath,card});
            card.focus(fullPath);
          }
        })
      }
    }, 
    components: {
      HomeView,
      EbtCardVue,
      SuttaPlayer,
    },
  }
</script>
<style>
</style>