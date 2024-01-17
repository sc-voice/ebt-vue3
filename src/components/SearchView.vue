<template>
  <v-sheet class="ebt-search">
    <div class="inspire" v-if="hasExamples" >
      <v-btn variant=tonal @click="onInspireMe"
        :id='card.autofocusId'
        @focus="onFocus"
      >
        {{$t('ebt.inspireMe')}}
      </v-btn>
    </div>
    <v-autocomplete 
      v-model="search" 
      :append-icon="search ? 'mdi-magnify' : ''"

      :id="`${card.id}-search`"
      @focus="onFocus"
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
    <SearchResults :card="card" :results="searchResults" 
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
  import { 
    DBG_FOCUS, DBG_SEARCH 
  } from '../defines.mjs';
  const msg = "SearchView.";

  export default {
    inject: ['config'],
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
        searchResults: undefined,
        search: '',
      }
    },
    components: {
      SearchResults,
    },
    methods: {
      onFocus(evt) {
        const msg = "SearchView.onFocus()";
        const dbg = DBG_FOCUS;
        let { volatile } = this;
        let appFocus = evt.target;
        dbg && console.log(msg, '[1]appFocus', appFocus.id);
        volatile.appFocus = appFocus;
      },
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
        const msg = "SearchView.onSearch()";
        const dbg = DBG_SEARCH;
        let { 
          settings, $t, volatile, url, search, card, suttas, 
        } = this;
        let res;
        if (!search) {
          return;
        }
        try {
          volatile.waitBegin('ebt.searching');
          //logger.info(msg, 'onSearch()', url);
          this.searchResults = undefined;
          card.location[0] = search;
          res = await volatile.fetchJson(url);
          this.searchResults = res.ok
            ? await res.json()
            : res;

          let routeHash = card.routeHash();
          dbg && console.log(msg, '[1]setRoute', routeHash);
          volatile.setRoute(routeHash, undefined, msg);
          let { results, mlDocs=[] } = this.searchResults;
          card.data = this.searchResults.results;
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
          this.searchResults = `ERROR: ${url} ${e.message}`;
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
        this.searchResults = undefined;
        this.search = '';
      },
    },
    mounted() {
      const msg = 'SearchView.mounted()';
      let { card, $route, settings, volatile} = this;
      let { langTrans, development } = settings;
      let { fullPath } = $route;
      let dbg = development && DBG_SEARCH;
      this.search = card.location[0];
      if (card.data == null) {
        dbg && console.log(msg, '[1] onSearch', {card, });
        nextTick(()=>this.onSearch());
      }

      card.onAfterMounted({settings, volatile});
    },
    computed: {
      resultsClass(ctx) {
        let { card, search } = this;
        return !search || card.location[0] === search 
          ? "ebt-results-new" 
          : "ebt-results-old";
      },
      exampleItems() {
        let { card, search, config, settings } = this;
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

        let MAX_CHOICES = config.searchDropdown || 5;
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
  margin-bottom: 0.8em;
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
