<template>
  <v-sheet id="ebt-cards" 
    color="background" :class="cardsClass" 
    v-touch="{
      left: ()=>onSwipe('left'),
      right: ()=>onSwipe('right'),
    }"
    @click.self.prevent.stop="onBgClick"
  >
    <div v-for="card in settings.cards" :key="card.id">
      <ebt-card-vue 
        :card="card" 
        :routeCard="volatile.routeCard"
        @focusin="onFocusIn($event, card)"
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
  import { default as CardFactory } from '../card-factory.mjs';
  import { default as EbtCardVue } from './EbtCard.vue';
  import { default as SuttaPlayer } from './SuttaPlayer.vue';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useSuttasStore } from '../stores/suttas.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { default as Playlist } from '../playlist.mjs';
  import { logger } from "log-instance/index.mjs";
  import { 
    DBG,
    DBG_HOME, DBG_STARTUP, DBG_FOCUS, 
    DBG_CLICK, DBG_OPEN_CARD, DBG_UPDATED, DBG_VISIBLE
  } from '../defines.mjs';

  export default {
    inject: ["config"],
    setup() {
      return {
        audio: useAudioStore(),
        suttas: useSuttasStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
        cardFactory: new CardFactory(),
      }
    },
    updated() {
      const msg = "EbtCards.updated()";
      const dbg = DBG_UPDATED;
      dbg && console.log(msg);
    },
    mounted() {
      const msg = 'EbtCards.mounted() ';
      const dbg = DBG.MOUNTED;
      let { cardFactory, settings, volatile, $route, config }  = this;
      let { params, path='/' }  = $route;
      let { cards, debugScroll } = settings;
      let addCard = (opts=>cardFactory.addCard(opts));
      let card = cardFactory.pathToCard({path, addCard});

      if (card == null) {
        dbg && console.warn(msg, "[3]no card", {$route, path});
        return;
      }

      if (card.location.length === 0) {
        if (card.context === EbtCard.CONTEXT_WIKI) {
          throw new Error(`${msg} missing wiki location`);
        }
      }

      //volatile.setRoute(card, true, msg);
      let { activeElement } = document;
      let scroll = true;
      if (path === '/') {
        dbg && console.log(msg, '[4]empty path', card.debugString);
      } else {
        dbg && console.log(msg, '[5]setRoute', card.debugString, path);
        volatile.setRoute(card, true);
      }
      switch (card.context) {
        case EbtCard.CONTEXT_WIKI:
          if (settings.tutorialState(false)) {
            volatile.scrollToCard(card);
          }
          break;
        default:
          volatile.scrollToCard(card);
          break;
      }

      this.bindAudioSutta(window.location.hash);
      dbg && console.log(msg, '[6]bindAudioSutta', {activeElement});
    },
    methods: {
      onBgClick(evt) {
        const msg = 'EbtCards.onBgClick()';
        const dbg = DBG_CLICK;
        let { volatile } = this;
        let { routeCard } = volatile;
        if (routeCard) {
          dbg && console.log(msg, '[1]scrollToCard', 
            routeCard.debugString, evt);
          volatile.scrollToCard(routeCard);
        } else {
          dbg && console.log(msg, '[2]elt?', evt);
        }
      },
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
      onFocusIn(evt, card) {
        const msg = "EbtCards.onFocusIn() ";
        const dbg = DBG_FOCUS || DBG.SCROLL;
        dbg && console.log(msg, '[0]', card.debugString, evt);
        let { cardFactory, volatile, settings } = this;
        let { appFocus } = volatile;
        let { context, location } = card;
        let routeHash = window.location.hash;
        let addCard = (opts=>{});
        let routeCard = cardFactory.pathToCard({
          path: routeHash,
          addCard,
          defaultLang: settings.langTrans,
        });
        if (routeCard === card) {
          dbg && console.log(msg, `[1]scrollToCard`, 
            card.debugString, {evt})
          //volatile.scrollToCard(card, appFocus);
        } else {
          dbg && console.log(msg, `[2]setRoute`, 
            card.debugString, {evt})
          //volatile.setRoute(card.routeHash(), true, msg);
        }
      },
      async bindAudioSutta(route) {
        let { volatile, suttas, audio, settings, } = this;
        let { routeCard } = volatile;
        switch (routeCard?.context) {
          case EbtCard.CONTEXT_PLAY: 
          case EbtCard.CONTEXT_SUTTA: {
            let suttaRef = EbtCard.routeSuttaRef(route, 
              settings.langTrans);
            if (suttaRef) {
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
          } break;
          default: {
            audio.setAudioSutta(null);
          } break;
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
        return settings.openCards.length === 1 
          ? "ebt-cards ebt-cards1" 
          : "ebt-cards";
      },
    },
    watch:{
      $route (to, from) {
        const msg = 'EbtCards.watch.$route';
        const dbg = DBG.ROUTE || DBG_OPEN_CARD;
        let { cardFactory, volatile, settings, $route }  = this;
        let card = cardFactory.pathToCard({
          path: to.fullPath, 
          addCard: (opts) => cardFactory.addCard(opts),
          defaultLang: settings.langTrans,
        });
        let { activeElement } = document;

        if (card?.isOpen) {
          dbg && console.log(msg, '[1]setRoute open', 
            {activeElement, to, from});
          volatile.setRoute(card, undefined, msg);
        } else if (card) {
          dbg && console.log(msg, '[2]setRoute closed', 
            {activeElement, to, from});
          card.open();
          volatile.setRoute(card, undefined, msg);
        }
        this.bindAudioSutta(to.href);
        if (card == null) {
          volatile.setRoute('', undefined, msg);
          dbg && console.log(msg, `[3]no-card`, {$route, to, from});
          return;
        }

        switch (card.context) {
          case EbtCard.CONTEXT_WIKI:
            volatile.updateWikiRoute({card, path:to});
            break;
          default:
            if (!card.isOpen) {
              card.open(true);
              dbg && console.log(msg, `[4]opened card`, 
                {$route, to, from, card});
            }
            break;
        }
        nextTick(() => { 
          let { ebtChips } = volatile;
          let { fullPath } = to;
          let { id, context } = card;
          if (ebtChips !== activeElement) {
            switch(context) {
              case EbtCard.CONTEXT_WIKI:
                if (card.isOpen) {
                  dbg && console.log(msg, '[5]focus', `${id} ${context}`, 
                    fullPath);
                  volatile.focusCardElementId(card, fullPath);
                }
                break;
              default:
              case EbtCard.CONTEXT_SEARCH:
              case EbtCard.CONTEXT_PLAY:
              case EbtCard.CONTEXT_SUTTA:
                dbg && console.log(msg, '[6]focus', `${id} ${context}`);
                volatile.focusCardElementId(card);
                break;
            }
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
