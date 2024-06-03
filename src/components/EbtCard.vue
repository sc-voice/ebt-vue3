<template>
<Transition>
  <v-sheet v-if="card.isOpen " :class="cardSheetClass"
    @click="onClickCard"
    :id="card.containerId"
  >
    <div :id="`${card.topAnchor}`" :class="topAnchorClass">
      {{card.topAnchor}}
    </div>
    <div :class="cardClass">
      <v-card :id="card.id" variant="flat" >
        <template v-slot:title>
          <div v-if="card.titleHref">
            <v-icon class="card-icon" :title="`${card.id}`">
              {{card.icon}}
            </v-icon>
            <a :href="card.titleHref" target="_blank" 
              :title="card.titleHref">
              <span :id="card.titleAnchor">{{card.chipTitle($t)}}</span>
            </a>
          </div>
          <div v-if="!card.titleHref">
            <v-icon class="card-icon" :title="`${card.id}`">
              {{card.icon}}
            </v-icon>
            <span :id="card.titleAnchor">{{card.chipTitle($t)}}</span>
          </div>
        </template>
        <template v-slot:append>
          <v-btn 
            v-if="card.alt1Icon && routeCard===card"
            :icon="card.alt1Icon" flat
            :id="card.graphId"
            :disabled="card.alt1Disabled()"
            @click.stop.prevent="clickAlt1"
          />
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
          <play-view v-if="card.context===CONTEXT_PLAY && routeCard" 
            :card="card" 
            :routeCard="routeCard"
          ></play-view>
          <graph-view v-if="card.context===CONTEXT_GRAPH"
            :card="card"
          >
          </graph-view>
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
  import { default as GraphView } from './GraphView.vue';
  import { default as HomeView } from './HomeView.vue';
  import { default as SearchView } from './SearchView.vue';
  import { default as SuttaView } from './SuttaView.vue';
  import { default as PlayView } from './PlayView.vue';
  import { default as EbtCard } from '../ebt-card.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { logger } from 'log-instance/index.mjs';
  import { SuttaRef } from 'scv-esm';
  import { nextTick, ref } from "vue";
  import { 
    DBG,
    DBG_CLICK, DBG_FOCUS, 
    DBG_UPDATED, DBG_VISIBLE, DBG_BLUR, DBG_VERBOSE,
    DBG_VIEWPORT,
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
      GraphView,
      HomeView,
      PlayView,
      SearchView,
      SuttaView,
    },
    beforeMount() {
      const msg = 'EbtCard.beforeMount() ';
      const dbg = DBG.MOUNTED;
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
      const dbg = DBG.MOUNTED; 
      let { card } = this;
      dbg && console.log(msg, '[1]addIntersectionObserver',
        card.debugString, );
      this.addIntersectionObserver();
    },
    unmounted() {
      const msg = 'EbtCard.unmounted() ';
      const dbg = DBG.MOUNTED;
      let { card } = this;
      //dbg && console.log(msg, card.debugString);
    },
    deactivated() {
      const msg = 'EbtCard.deactivated() ';
      const dbg = DBG.MOUNTED;
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
        const dbg = DBG_FOCUS; let { volatile, audio } = this;
        let { ebtChips } = volatile;
        dbg && console.log(msg, {ebtChips});
        ebtChips && volatile.focusElement(ebtChips);
        audio.playBlock();
      },
      onClickCard(evt) {
        const msg = "EbtCard.onClickCard() ";
        const dbg = DBG_CLICK;
        const dbgv = dbg && DBG_VERBOSE;
        let { volatile, settings, card } = this;
        let { appFocus } = volatile;
        dbg && console.log(msg, card.debugString, evt);

        //volatile.onClickCard(evt, card);
        let { target } = evt || {};
        let { nodeName, localName, href, hash } = target;
        if (card.hasFocus(appFocus)) {
          if (nodeName === 'A') {
            dbg && console.log(msg, '[1]n/a', target);
          } else {
            dbg && console.log(msg, '[2]focusElement', appFocus.id, evt);
            volatile.focusElement(appFocus);
          }
        } else {
           volatile.setRoute(card, undefined, msg);
           let elt = document.getElementById(card.tab1Id);
           dbg && console.log(msg, '[3]focusElement', elt.id);
           volatile.focusElement(elt);
        }
      },
      onBackTabOut(evt) {
        const msg = 'EbtCard.onBackTabOut()';
        const dbg = DBG_FOCUS;
        let { volatile } = this;
        let { ebtChips } = volatile;
        dbg && console.log(msg, 'focus', {ebtChips});
        ebtChips && volatile.focusElement(ebtChips);
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
      async openPlaylist(pattern) {
        const msg = "EbtCard.openPlaylist()";
        const dbg = DBG.PLAYLIST;
        let { volatile, card } = this;
        let {
          docLang, docAuthor, suttaRefs
        } = await volatile.searchResults(pattern);
        let sr0 = suttaRefs[0];
        let fullPattern = `${pattern} -da ${docLang} -da ${docAuthor}`;
        let hash = [
          '#/play',
          sr0.scid,
          docLang,
          docAuthor,
          encodeURIComponent(fullPattern),
        ].join('/');

        dbg && console.log(msg, {
          hash, docLang, docAuthor, suttaRefs, pattern
        });
        window.location.hash = hash;
      },
      clickAlt1(evt) {
        const msg = "EbtCard.clickAlt1()";
        const dbg = DBG_CLICK;
        const { audio, card, volatile } = this;
        const { context, location } = card;
        dbg && console.log(msg, evt);
        switch (context) {
          case EbtCard.CONTEXT_SEARCH: {
            let [ pattern ] = location;
            this.openPlaylist(pattern);
          } break;
          case EbtCard.CONTEXT_PLAY: 
          case EbtCard.CONTEXT_WIKI:
          case EbtCard.CONTEXT_GRAPH:
          case EbtCard.CONTEXT_SUTTA: {
            let { alt1Href } = this;
            volatile.setRoute(alt1Href);
            audio.playClick();
          } break;
        }
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
        let { volatile, settings, card } = this;
        let topId = card.topAnchor;
        dbg && console.log(msg, 'scrollToElementId', topId, evt);
        settings.scrollToElementId(topId);
        volatile.appFocus = evt.target;
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
        for (let i=nCards; --i >= 0; ) { 
          // Show most recently opened card
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
          ebtChips && volatile.focusElement(ebtChips);
          volatile.setRouteCard(null)
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
      CONTEXT_WIKI() { return EbtCard.CONTEXT_WIKI; },
      CONTEXT_SEARCH() { return EbtCard.CONTEXT_SEARCH; },
      CONTEXT_GRAPH() { return EbtCard.CONTEXT_GRAPH; },
      CONTEXT_DEBUG() { return EbtCard.CONTEXT_DEBUG; },
      CONTEXT_SUTTA() { return EbtCard.CONTEXT_SUTTA; },
      CONTEXT_PLAY() { return EbtCard.CONTEXT_PLAY; },
      alt1Href(ctx) {
        const { config, card, volatile, settings } = this;
        const { docLang } = settings;
        const { context, location } = card;
        let href;
        switch (context) {
          case EbtCard.CONTEXT_WIKI: {
            href = config.homePath;
          } break;
          case EbtCard.CONTEXT_PLAY: {
            let loc3 = location.slice(0,3);
            let sref = SuttaRef.create(loc3.join('/'), docLang);
            let { sutta_uid, lang, author } = sref;
            href = ['#', EbtCard.CONTEXT_GRAPH, sutta_uid, lang, author]
              .join('/');
          } break;
          case EbtCard.CONTEXT_SUTTA: {
            let sref = SuttaRef.create(location.join('/'), docLang);
            let { sutta_uid, lang, author } = sref;
            href = ['#', EbtCard.CONTEXT_GRAPH, sutta_uid, lang, author]
              .join('/');
          } break;
          case EbtCard.CONTEXT_GRAPH: {
            let sref = SuttaRef.create(location.join('/'), docLang);
            let { sutta_uid, lang, author } = sref;
            href = ['#', EbtCard.CONTEXT_SUTTA, ...location]
              .join('/');
          } break;
          default: 
            break;
        }

        return href;
      },
      isSuttaCard(ctx) {
        let { card } = ctx;
        return card.context === EbtCard.CONTEXT_SUTTA;
      },
      topAnchorClass(ctx) {
        return DBG_VIEWPORT
          ? "card-top-anchor card-top-anchor-debug"
          : "card-top-anchor";
      },
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
          title: $t('ebt.context-play'),
          value: EbtCard.CONTEXT_PLAY,
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

