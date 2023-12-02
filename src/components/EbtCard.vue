<template>
<Transition>
  <v-sheet v-if="card.isOpen " :class="cardSheetClass"
    @focusin="onFocusIn"
    @click="onClickCard"
    id="`${card.id}-sheet`"
  >
    <div :id="`${card.topAnchor}`" class="card-top-anchor debug">
      {{card.topAnchor}}
    </div>
    <div :class="cardClass">
      <v-card :id="card.id" variant="flat" >
        <template v-slot:title>
          <v-icon class="card-icon" :title="`${card.id}`">
            {{card.icon}}
          </v-icon>
          <span :id="card.titleAnchor">{{card.chipTitle($t)}}</span>
        </template>
        <template v-slot:append>
          <v-btn icon="mdi-window-minimize" flat 
            :id="card.tab1Id"
            @click="clickMinimize"
            @focus="focusTop"
            @keydown.shift.tab.exact.prevent="onBackTabOut"
          />
          <v-btn icon="mdi-close-thick" flat 
            v-if="isClosable"
            @click="clickDelete"
            @focus="focusTop"
          />
        </template>
        <v-card-text>
          <debug-view :card="card" v-if="card.context===CONTEXT_DEBUG"/>
          <template v-if="volatile.config">
            <HomeView v-if="card.context===CONTEXT_WIKI" :card="card" />
          </template>
          <search-view :card="card" v-if="card.context===CONTEXT_SEARCH"/>
          <sutta-view v-if="card.context===CONTEXT_SUTTA && routeCard" 
            :card="card" 
            :routeCard="routeCard"
          ></sutta-view>
        </v-card-text>
        <div class="last-tab" tabindex=0 
          @click='onClickLastTab'
          @focus='onFocusLastTab'>
          <v-icon icon='mdi-keyboard-tab' />
        </div>
      </v-card>
    </div>
  </v-sheet>
</Transition>
</template>

<script>
  import { default as DebugView } from './DebugView.vue';
  import { default as HomeView } from './HomeView.vue';
  import { default as SearchView } from './SearchView.vue';
  import { default as SuttaView } from './SuttaView.vue';
  import { default as EbtCard } from '../ebt-card.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { logger } from 'log-instance/index.mjs';
  import { nextTick, ref } from "vue";
  import { 
    DEBUG_CLICK, DEBUG_MOUNTED, DEBUG_FOCUS, DEBUG_SCROLL 
  } from '../defines.mjs';

  export default {
    inject: ['config'],
    props: {
      card: { type: Object, },
      routeCard: { type: Object },
    },
    setup() {
      return {
        audio: useAudioStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
        observer: ref(undefined),
      }
    },
    components: {
      DebugView,
      HomeView,
      SearchView,
      SuttaView,
    },
    beforeMount() {
      const msg = 'EbtCard.beforeMount() ';
      let { card, $route, volatile, settings } = this;
      let { fullPath:path } = $route;
      let { langTrans:defaultLang } = settings;
      let { id, location, context } = card;
      let dbg = DEBUG_MOUNTED || DEBUG_FOCUS;
      if (card.matchPath({path, defaultLang})) {
        dbg && console.log(msg, '[1]routeCard',
          `${id}_${context}:${location[0]}`);
        volatile.setRouteCard(card);
      }
    },
    mounted() {
      const msg = 'EbtCard.mounted() ';
      this.addIntersectionObserver();
    },
    updated() {
      this.addIntersectionObserver();
    },
    methods: {
      onClickLastTab(evt) {
        const msg = 'EbtCard.onClickLastTab() ';
        let dbg = DEBUG_CLICK;
        dbg && console.log(msg);
      },
      onFocusLastTab(evt) {
        const msg = 'EbtCard.onFocusLastTab() ';
        let { volatile, audio } = this;
        let { ebtChips } = volatile;
        //console.log(msg, ebtChips);
        ebtChips && ebtChips.focus();
        audio.playBlock();
      },
      onClickCard(evt) {
        const msg = "EbtCard.onClickCard() ";
        let { volatile, settings, card } = this;
        volatile.onClickCard(evt, card);
        //let dbg = DEBUG_FOCUS||DEBUG_CLICK;
        //dbg && console.log(msg, 'setRoute', card.id, evt);
        //volatile.setRoute(card, undefined, msg);
      },
      onBackTabOut(evt) {
        let { volatile } = this;
        volatile.ebtChips && volatile.ebtChips.focus();
      },
      onFocusIn(evt) {
        const msg = "EbtCard.onFocusIn() ";
        let { settings, volatile, card } = this;
        let { location, id, context } = card;
        let chipTitle = card.chipTitle();
        let dbg = DEBUG_FOCUS;
        switch (card.context) {
          case EbtCard.CONTEXT_SUTTA:
          case EbtCard.CONTEXT_SEARCH:
            dbg && console.log(msg, "[1]scrollToCard", {id, evt});
            settings.scrollToCard(card);
            break;
          case EbtCard.CONTEXT_WIKI:
            dbg && console.log(msg, "[2]wiki", {id, evt});
            break;
          default:
            dbg && console.warn(msg, "[3]", {id, evt});
            break;
        }
      },
      clickDelete() {
        const msg = "EbtCard.clickDelete()";
        let { card, settings, config } = this;
        let dbg = DEBUG_CLICK;
        this.clickMinimize();
        setTimeout(()=>{
          dbg && console.log(msg, card.id);
          settings.removeCard(card, config);
        }, 500);
      },
      clickMinimize() {
        const msg = "EbtCard.clickMinimize()";
        let { audio, card, settings } = this;
        let dbg = DEBUG_CLICK;
        settings.tutorClose = false;
        dbg && console.log(msg, card.id);
        audio.playClick();
        this.closeCard(card, settings);
      },
      focusTop(evt) {
        const msg = "EbtCard.focusTop()";
        let { settings, card } = this;
        let topId = card.topAnchor;
        let dbg = DEBUG_FOCUS;
        dbg && console.log(msg, {evt,topId});
        settings.scrollToElementId(topId);
      },
      closeCard: (card, settings) => {
        card.isOpen = false;
        let volatile = useVolatileStore();
        let { ebtChips } = volatile;
        ebtChips && ebtChips.focus();
      },
      addIntersectionObserver() {
        let { card, observer } = this;
        let { id } = card;
        let elt = document.getElementById(card.id);
        if (!elt || this.observer) {
          return;
        }

        setTimeout(()=>{ // wait for full-size element
          let { scrollHeight } = elt;
          let callback = (entries, observer) => {
            logger.debug(`IntersectionObserver#${id}`, entries);
            card.visible = entries[0].isIntersecting;
          }
          const HEADER_HEIGHT = 104;
          const LINE_HEIGHT = 20;
          let threshold = [
            HEADER_HEIGHT+2*LINE_HEIGHT,   
          ].map(t=>Math.min(1,t/scrollHeight));
          let obsOpts = {
            root: null,
            rootMargin: "0px",
            threshold,
          }
          let observer = new IntersectionObserver(callback, obsOpts);
          this.observer = observer;
          observer.observe(elt);
          let routeHash = card.routeHash();
        }, 300);
      },
    },
    computed: {
      cardSheetClass(ctx) {
        let { card } = ctx;
        return card.isOpen
          ? 'card-sheet'
          : 'card-sheet-closed';

      },
      isClosable(ctx) {
        let { card } = ctx;
        return card.context !== EbtCard.CONTEXT_WIKI;
      },
      showDev(ctx) {
        let logLevel = ctx.settings.logLevel;

        return logLevel === 'info' || logLevel === 'debug';
      },
      cardClass(ctx) {
        const msg = 'EbtCard.cardClass';
        let { settings, volatile, card } = ctx;
        let dbg = settings.development && DEBUG_FOCUS;
        let cardClass = `ebt-card ebt-card-${card.context}`;
        let { routeCard } = volatile;

        if (routeCard?.id === card?.id) {
          cardClass += ' ebt-card-current';
          dbg && console.log(msg, '[1]routeCard', card.id); 
        } else {
          //dbg && console.log(msg, '[2]card', card, routeCard);
        }

        return cardClass;
      },
      cardLink: (ctx) => {
        let { card } = ctx;
        let { context, location } = card;
        context = encodeURIComponent(context);
        location = location.map(loc => encodeURIComponent(location)).join('/');
        let link = `/${context}/${location}`;
        return link;
      },
      CONTEXT_DEBUG: (ctx)=>EbtCard.CONTEXT_DEBUG,
      CONTEXT_WIKI: (ctx)=>EbtCard.CONTEXT_WIKI,
      CONTEXT_SEARCH: (ctx)=>EbtCard.CONTEXT_SEARCH,
      CONTEXT_SUTTA: (ctx)=>EbtCard.CONTEXT_SUTTA,
      contexts: (ctx) => {
        let { $t } = ctx;
        return [{
          title: $t('ebt.context-home'),
          value: EbtCard.CONTEXT_WIKI,
        },{
          title: $t('ebt.context-sutta'),
          value: EbtCard.CONTEXT_SUTTA,
        },{
          title: $t('ebt.context-search'),
          value: EbtCard.CONTEXT_SEARCH,
        },{
          title: $t('ebt.context-debug'),
          value: EbtCard.CONTEXT_DEBUG,
        }];
      },
    },
  }
</script>

<style >
</style>

