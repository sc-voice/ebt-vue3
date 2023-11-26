<template>
  <v-sheet class="ebt-search">
    <v-autocomplete 
      :id='card.autofocusId'
      v-model="search" 
      :append-icon="search ? 'mdi-magnify' : ''"

      @click:append="onSearch"
      @click:clear="onSearchCleared($event, card)"
      :hint="$t('auth.required')"
      @update:search="updateSearch($event)"
      @keyup.enter="onEnter($event)"
      class="search-field"
      :filter="searchFilter"
      :items="exampleItems"
      :label="$t('ebt.search')"
      :placeholder="$t('ebt.searchPrompt')"
      variant="underlined"
    />
    <div class="inspire" v-if="hasExamples">
      <v-btn variant=tonal @click="onInspireMe">
        {{$t('ebt.inspireMe')}}
      </v-btn>
    </div>
    <SearchResults :card="card" :results="results" 
      :class="resultsClass"/>
  </v-sheet>
</template>

<script>
  import { default as SearchResults } from "./SearchResults.vue";
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useSuttasStore } from '../stores/suttas.mjs';
  import { default as IdbSutta } from '../idb-sutta.mjs';
  import * as Idb from 'idb-keyval';
  import { logger } from "log-instance/index.mjs";
  import { Examples } from "scv-esm";
  import { ref, nextTick } from "vue";
  import { DEBUG_SEARCH } from '../defines.mjs';
  const msg = "SearchView.";

  export default {
    props: {
      card: {
        type: Object,
      },
    },
    setup() {
      const settings = useSettingsStore();
      const volatile = useVolatileStore();
      const suttas = useSuttasStore();
      return {
        settings,
        volatile,
        suttas,
      }
    },
    data: () => {
      return {
        results: undefined,
        search: '',
      }
    },
    components: {
      SearchResults,
    },
    methods: {
      onInspireMe() {
        let { langTrans, settings } = this;
        let that = this;
        let langEx = Examples[langTrans] || [];
        let iExample = Math.trunc(Math.random() * langEx.length);
        let eg = langEx[iExample];
        this.search = eg;
        nextTick(()=>{ this.onSearch(); });
        //logger.info(msg, 'onInspireMe()', eg);
      },
      searchFilter(item, queryText, itemText) {
        let it = itemText.toLowerCase();
        let qt = queryText.toLowerCase();
        return it.indexOf(qt) >= 0;
      },
      onEnter(evt) {
        let { search } = this;
        //logger.info(msg, 'onEnter()', {evt});
        search && this.onSearch();
      },
      async onSearch() {
        let { settings, $t, volatile, url, search, card, suttas, } = this;
        let res;
        if (!search) {
          return;
        }
        try {
          volatile.waitBegin('ebt.searching');
          //logger.info(msg, 'onSearch()', url);
          this.results = undefined;
          card.location[0] = search;
          res = await volatile.fetchJson(url);
          this.results = res.ok
            ? await res.json()
            : res;

          volatile.setRoute(card.routeHash(), undefined, msg);
          let { mlDocs=[] } = this.results;
          card.data = this.results.results;
          mlDocs.forEach(mlDoc=>volatile.addMlDoc(mlDoc));
          for (let i = 0; i < mlDocs.length; i++) {
            try {
              let mlDoc = mlDocs[i];
              let { sutta_uid, lang, author_uid } = mlDoc;
              volatile.waitBegin('ebt.processing', 
                volatile.ICON_PROCESSING, sutta_uid);

              let idbKey = IdbSutta.idbKey({
                sutta_uid, lang, author:author_uid});
              let idbData = await Idb.get(idbKey);
              let idbSutta;
              let msStart2 = Date.now();
              if (idbData) {
                idbSutta = IdbSutta.create(idbData);
                idbSutta.merge({mlDoc});
              } else {
                idbSutta = IdbSutta.create(mlDoc);
              }

              suttas.saveIdbSutta(idbSutta);
              let result = card.data[i];
              result.segsMatched = idbSutta.segments.reduce((a,v)=>{
                return a + (v.matched ? 1 : 0);
              }, 0);
              result.showMatched = Math.min(3, result.segsMatched);
              delete result.sections;
              result.segments = idbSutta.segments;
            } finally {
              volatile.waitEnd();
            }
          }
        } catch(e) {
          logger.warn("onSearch() ERROR:", res, e);
          this.results = `ERROR: ${url} ${e.message}`;
        } finally {
          volatile.waitEnd();
        }
      },
      updateSearch(search) {
        let { card } = this;
        if (search) {
          this.search = search;
        }
      },
      onSearchKey(evt) {
        if (evt.code === "Enter") {
          let { card, search } = this;
          //logger.info(msg, 'onSearchKey()', {card, search});
          search && this.onSearch();
          evt.preventDefault();
        }
      },
      onSearchCleared(evt) {
        this.results = undefined;
        this.search = '';
      },
    },
    mounted() {
      const msg = 'SearchView.mounted()';
      let { card, $route, settings} = this;
      let { langTrans, development } = settings;
      let { fullPath } = $route;
      let dbg = development && DEBUG_SEARCH;
      this.search = card.location[0];
      if (card.data == null) {
        dbg && console.log(msg, '[1] onSearch', {card, });
        nextTick(()=>this.onSearch());
      }
      if (card.matchPath({path:fullPath, defaultLang:langTrans})) {
        let { activeElement } = document;
        dbg && console.log(msg, '[2] focus', 
          {fullPath, $route, activeElement});
        card.focus(fullPath);
        dbg && console.log(msg, '[3] focus', document.activeElement);
      } else {
        let routeHash = card.routeHash();
        dbg && console.log(msg, '[4]', {id:card.id, routeHash});
      }
    },
    computed: {
      resultsClass(ctx) {
        let { card, search } = this;
        return !search || card.location[0] === search 
          ? "ebt-results-new" 
          : "ebt-results-old";
      },
      exampleItems() {
        let { card, search, settings } = this;
        search = search || ''; // might be null or undefined 
        let { langTrans, maxResults } = settings;
        var searchLower = search.toLowerCase();
        var langEx = Examples[langTrans] || Examples.en;
        var examples = search
          ? langEx.filter(ex=>ex.toLowerCase().indexOf(searchLower)>=0)
          : langEx;

        // Include card location
        let loc0 = card.location[0];
        loc0 = loc0 ? loc0.toLowerCase() : '';
        if (loc0 && loc0 !== search.toLowerCase()) {
          examples = [loc0, ...examples];
        }

        // Include adhoc search
        examples = !search || Examples.isExample(search)
          ? [...examples ]
          : [`${this.search}`, ...examples];

        let MAX_CHOICES = 8; // TODO: Ayya Sabbamitta wants more
        return examples.slice(0,MAX_CHOICES);
      },
      url: (ctx) => {
        let { volatile, search, } = ctx;
        return volatile.searchUrl(search);
      },
      displayBox(ctx) {
        let { volatile } = ctx;
        let { displayBox } = volatile;
        return displayBox.value || displayBox;
      },
      langTrans(ctx) {
        return ctx.settings.langTrans;
      },
      hasExamples(ctx) {
        let { langTrans } = ctx;
        return !!Examples[langTrans];
      }
    },
  }
</script>

<style>
.inspire {
  display: flex;
  justify-content: center;
}
.ebt-search {
  max-width: 50em;
}
.ebt-results-new {
  margin-top: 1em;
}
.ebt-results-old {
  opacity: 0.5;
  margin-top: 1em;
}
.v-autocomplete__content {
  border: 1pt solid rgb(var(--v-theme-matched));
}
</style>