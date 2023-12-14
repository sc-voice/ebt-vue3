<template>
<Transition>
  <v-sheet v-if="card.isOpen " :class="cardSheetClass"
    @click.stop.prevent="onClickCard"
    :id="card.containerId"
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
            @click.stop.prevent="clickMinimize"
            @focus="focusTop"
            @blur="blurTop"
            @keydown.shift.tab.exact.prevent="onBackTabOut"
          />
          <v-btn icon="mdi-close-thick" flat 
            v-if="isClosable"
            :id="card.deleteId"
            @click.stop.prevent="clickDelete"
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
    DBG_CLICK, DBG_MOUNTED, DBG_FOCUS, DBG_SCROLL,
    DBG_UPDATED, DBG_VISIBLE, DBG_BLUR, DBG_VERBOSE,
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
      const dbg = DBG_MOUNTED;
      let { card, $route, volatile, settings } = this;
      let { fullPath:path } = $route;
      let { langTrans:defaultLang } = settings;
      let { id, location, context } = card;
      if (card.matchPath({path, defaultLang})) {
        dbg && console.log(msg, '[1]routeCard',
          `${id}_${context}:${location[0]}`);
        volatile.setRouteCard(card);
      }
    },
    mounted() {
      const msg = 'EbtCard.mounted() ';
      const dbg = DBG_MOUNTED; 
      let { card } = this;
      dbg && console.log(msg, '[1]addIntersectionObserver',
        card.debugString, );
      this.addIntersectionObserver();
    },
    unmounted() {
      const msg = 'EbtCard.unmounted() ';
      const dbg = DBG_MOUNTED;
      let { card } = this;
      //dbg && console.log(msg, card.debugString);
    },
    deactivated() {
      const msg = 'EbtCard.deactivated() ';
      const dbg = DBG_MOUNTED;
      dbg && console.log(msg, this.debugString);
    },
    updated() {
      const msg = 'EbtCard.updated() ';
      const dbg = DBG_UPDATED;
      let { card } = this;
      let { isOpen } = card;
      if (isOpen) {
        dbg && console.log(msg, '[1]open addIntersectionObserver',
          card.debugString );
        this.addIntersectionObserver();
      } else {
        //dbg && console.log(msg, '[2]closed', card.debugString );
      }     
    },
    methods: {
      onClickLastTab(evt) {
        const msg = 'EbtCard.onClickLastTab() ';
        let dbg = DBG_CLICK;
        dbg && console.log(msg);
      },
      onFocusLastTab(evt) {
        const msg = 'EbtCard.onFocusLastTab() ';
        const dbg = DBG_FOCUS;
        let { volatile, audio } = this;
        let { ebtChips } = volatile;
        dbg && console.log(msg, {ebtChips});
        ebtChips && ebtChips.focus();
        audio.playBlock();
      },
      onClickCard(evt) {
        const msg = "EbtCard.onClickCard() ";
        const dbg = DBG_CLICK;
        const dbgv = dbg && DBG_VERBOSE;
        let { volatile, settings, card } = this;
        //dbg && console.log(msg, 'onClickCard', card.debugString);
        //volatile.onClickCard(evt, card);
        let { target } = evt || {};
        let { localName, href, hash } = target;
        dbgv && console.log(msg, '[1]setRoute', card.debugString, evt);
        if (!card.hasFocus) {
           volatile.setRoute(card, undefined, msg);
           let elt = document.getElementById(card.tab1Id);
           dbg && console.log(msg, '[2]focusElement', elt.id);
           volatile.focusElement(elt);
        }
      },
      onBackTabOut(evt) {
        const msg = 'EbtCard.onBackTabOut()';
        const dbg = DBG_FOCUS;
        let { volatile } = this;
        let { ebtChips } = volatile;
        dbg && console.log(msg, 'focus', {ebtChips});
        ebtChips && ebtChips.focus();
      },
      clickDelete(evt) {
        const msg = "EbtCard.clickDelete()";
        let { card, settings, config } = this;
        let dbg = DBG_CLICK;
        this.clickMinimize(evt);
        setTimeout(()=>{
          dbg && console.log(msg, 'removeCard', card.debugString);
          settings.removeCard(card, config);
        }, 500);
      },
      clickMinimize(evt) {
        const msg = "EbtCard.clickMinimize()";
        let { audio, card, settings } = this;
        let dbg = DBG_CLICK;
        settings.tutorClose = false;
        dbg && console.log(msg, card.id);
        audio.playClick();
        this.closeCard(card, settings);
      },
      blurTop(evt) {
        const msg = "EbtCard.blurTop()";
        const dbg = DBG_BLUR && DBG_VERBOSE;
        dbg && console.log(msg, evt);
      },
      focusTop(evt) {
        const msg = "EbtCard.focusTop()";
        const dbg = DBG_FOCUS;
        let { settings, card } = this;
        let topId = card.topAnchor;
        dbg && console.log(msg, 'scrollToElementId', topId, evt);
        settings.scrollToElementId(topId);
      },
      closeCard: (card, settings) => {
        const msg = 'EbtCard.closeCard()';
        const dbg = DBG_CLICK || DBG_FOCUS;
        card.open(false);
        let volatile = useVolatileStore();
        let { ebtChips } = volatile;
        let { cards } = settings;
        dbg && console.log(msg, '[1]focus', {ebtChips});
        let iSelf = cards.findIndex(c=>c === card);
        let nCards = cards.length;
        let iNext = (iSelf+1) % nCards;
        let routeCard = null;
        for (let i=1; i<nCards; i++) {
          let c = cards[(iSelf+i)%nCards];
          if (c.isOpen) {
            routeCard = c;
            break;
          }
        }
        if (routeCard) {
          setTimeout(()=>{
            // HACK: Wait until display stabilizes before changing the
            // route so that the routeCard can be scrolled into view
            // with the proper selection.  None of the Vue events
            // (e.g., deactivated, unmounted, updated) are triggered 
            // when the DOM tree is rendered after being updated
            dbg && console.log(msg, '[2]setRoute', 
              routeCard.debugString);
            volatile.setRoute(routeCard);
          }, 500);
        } else {
          ebtChips && ebtChips.focus();
        }
      },
      addIntersectionObserver() {
        let { card, observer } = this;
        let { id } = card;
        let elt = document.getElementById(card.id);
        if (!elt || this.observer) {
          return;
        }

        setTimeout(()=>{ // wait for full-size element
          const msg = "EbtCard.intersectionObserver()";
          const dbg = DBG_VISIBLE;
          let { scrollHeight } = elt;
          let callback = (entries, observer) => {
            dbg && console.log(msg, card.debugString, entries);
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
        let dbg = settings.development && DBG_FOCUS;
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

