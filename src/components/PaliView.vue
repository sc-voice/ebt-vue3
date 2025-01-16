<template>
  <v-sheet class="">
    <v-expand-x-transition >
      <v-autocomplete  v-if="showSearch"
        v-model="search" 
        transition="expand-x-transition"

        :id="`${card.id}-search`"
        variant="underlined"
        :placeholder="$t('ebt.enterPaliWordOrDefinition')"
        class="search-field"
        hide-no-data
        menu
        :items="items"
        min-width="350px"
        autofocus
        :custom-filter="customFilter"

        @update:search="updateSearch"
        @update:modelValue="updateModelValue"
        @keyup.enter="onEnter"
      />
    </v-expand-x-transition>
    <div v-if="dictResult && groups" class="dict" >
      <v-expansion-panels v-model="panels" 
        variant="popout"
        @update:modelValue="onPanelUpdate"
      >
        <v-expansion-panel v-for="(group,ig) in groups" key="ig"
          :value="ig"
          collapse-icon="mdi-format-list-bulleted"
          expand-icon="mdi-format-list-bulleted"
        >
          <v-expansion-panel-title class="pali-panel-title">
            <div class="pali-panel-title-text"
              :title="group.construction"
            >
              <a :href="`#/pali/${group.word}`" tabindex=-1>
                {{group.lemma}}
              </a>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <audio v-if="group.audioUrl"
              :id="`${card.id}-${ig}-audio`"
              controls :src="group.audioUrl"
            ></audio>
            <template v-if="volatile.dictionary"
              v-for="(def,i) in groupDefinitions(group)">
              <div class="pali-group">
                <v-tooltip location="top" 
                  :text="dpdCartoucheTitle(def)"
                  content-class="dpd-tooltip"
                  max-width="350px"
                  open-on-click
                  >
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" density="compact"
                      class="tooltip-button"
                    >
                      <span v-html="dpdCartoucheHtml(def,i)"></span>
                    </v-btn>
                  </template>
                </v-tooltip>
                <span v-html="meaningHtml(def)" class="ml-1"></span>
              </div>
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div><!-- dict -->
    <div class="dpd-link">
      <a :id="idDpdLink" :href="dpdUrl()" target="_blank">
        <div>
          <span style="font-size:smaller">Digital Pali Dictionary</span>
          <br>
          {{search}} 
          <v-icon>mdi-open-in-new</v-icon>
        </div>
      </a>
    </div>
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { ref, nextTick } from "vue";
  import { DBG, } from '../defines.mjs';
  import { default as EbtCard } from '../ebt-card.mjs';
  import { Dictionary } from "@sc-voice/ms-dpd";
  const MAX_HISTORY = 100;
  const MAX_DEFINITIONS = 100;
  const history = [];
  const items = ref();
  const panels = ref();

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

      return {
        settings,
        volatile,
      }
    },
    data: () => {
      const dictResult = ref();
      const groups = ref();
      return {
        dictResult,
        panels,
        search: undefined,
        showInNewCard: false,
        history,
        items,
        groups,
      }
    },
    components: {
    },
    methods: {
      async onPanelUpdate(iPanel) {
        const msg = "PaliView.onPanelUpdate:";
        let { groups } = this;
        let group = groups[iPanel];
        if (group) {
          if (!group.audioUrl) {
            group.audioUrl = await this.groupAudioUrl(group);
            console.log(msg, '[1]audioUrl', group.audioUrl);
          } else {
            console.log(msg, '[2]audioUrl', group.audioUrl);
          }
        } else {
          console.warn(msg, '[3]group?', iPanel);
        }
      },
      async lemmaGroups() {
        const msg = "PaliView.lemmaGroups()";
        let { definition, dictResult } = this;
        let { data } = dictResult;
        let dPrev = null;

        data.sort((a,b)=>{
          return a.lemma_1.localeCompare(b.lemma_1);
        });
        let groups = data.reduce((a,d) => {
          let { word, construction, lemma_1 } = d;
          let [ lemma, ...lemmaTail ]  = lemma_1.split(' ');
          word = word.toLowerCase();
          construction = construction && construction.toLowerCase();
          if (word !== dPrev?.word || lemma !== dPrev?.lemma) {
            let group = {
              word, 
              lemma, 
              construction, 
              audioUrl:ref(),
            };
            if (lemmaTail.length) {
              group.lemmaTail = lemmaTail.join(' ');
            }
            a.push(group);
          }
          d.lemma = lemma;
          dPrev = d;
          return a;
        }, []);

        return groups;
      },
      dpdLink(word) {
        let link = Dictionary.dpdLink(word);
        return link;
      },
      dpdUrl() {
        const msg = "PaliView.dpdUrl";
        let ebtWord = this.card.location[0];
        let link = this.dpdLink(ebtWord);
        return link?.url;
      },
      customFilter(value, search, internal) {
        const msg = "PaliView.customFilter";
        const dbg = DBG.PALI_SEARCH;
        const dbgv = DBG.VERBOSE && dbg;
        if (search == null || value==null) {
          dbgv && console.log(msg, '[1]null', {search, value});
          return true;
        }

        if (value.startsWith(search)) {
          dbgv && console.log(msg, '[2]startsWith', {search, value});
          return true;
        }

        let pat = `^${Dictionary.unaccentedPattern(search)}`;
        let re = new RegExp(pat, 'i');
        if (re.test(value)) {
          dbgv && console.log(msg, '[3]unaccented', {search, value});
          return true;
        }

        return false;
      },
      async groupAudioUrl(group) {
        const msg = "PaliView.groupAudioUrl()";
        const dbg = DBG.PALI_VIEW;
        let { settings } = this;
        let { word, lemma } = group;
        let urlPlay = [
          settings.serverUrl,
          'dictionary',
          'en',
          'dpd',
          lemma,
          'Aditi',
          'Amy',
        ].join('/');
        let res = await fetch(urlPlay);
        if (!res.ok) {
          console.err(msg, res);
          return undefined;
        }
        let json = await res.json();
        let { paliGuid } = json;
        let urlPaliAudio = [
          settings.serverUrl,
          'audio',
          'dpd',
          'pli',
          'dpd',
          'Aditi',
          paliGuid,
        ].join('/')
        group.audioUrl = urlPaliAudio;
        console.log(msg, group);
        dbg && console.log(msg, word, urlPlay, paliGuid, urlPaliAudio);
        return urlPaliAudio;
      },
      dpdCartoucheTitle(def) {
        let { volatile } = this;
        return volatile.dpdCartoucheTitle(def);
      },
      dpdCartoucheHtml(def, i) {
        let { volatile } = this;
        return volatile.dpdCartoucheHtml(def,i, {showLemma:false});
      },
      meaningHtml(def) {
        const msg = "PaliView.meaningHtml()";
        const dbg = 0;
        let { meaning_lit, meaning_1, meaning_raw } = def;
        let { $t, dictResult } = this;
        if (dictResult) {
          let { method, pattern } = dictResult;
          if (method === 'entry') {
            let re = new RegExp(pattern, 'ig');
            meaning_1 = meaning_1 && meaning_1.replace(re, 
              `<span class="dict-pat">${pattern}</span>`
            );
            meaning_raw = meaning_raw && meaning_raw.replace(re, 
              `<span class="dict-pat">${pattern}</span>`
            );
            meaning_lit = meaning_lit && meaning_lit.replace(re, 
              `<span class="dict-pat">${pattern}</span>`
            );
          }
        }
        let result = [];
        if (meaning_1) {
          result.push(meaning_1);
        }
        if (meaning_raw) {
          result.push(`<span class="dpd-raw">${meaning_raw}</span>`);
        }

        if (meaning_lit) {
          let dpdLit = $t('ebt.dpdLit');
          result.push(
            `<span class="dpd-lit">${dpdLit} ${meaning_lit}</span>`
          );
        }
        return result.join('; ');
      },
      runSearch(opts={}) {
        const msg = "PaliView.runSearch()";
        const dbg = DBG.PALI_SEARCH;
        let { 
          search=this.search?.value, openNew
        } = opts;
        let { card, config, volatile, settings } = this;
        let { dictionary } = volatile;
        let { maxDefinitions=MAX_DEFINITIONS } = config;
        let res = search && dictionary && dictionary.find(search);
        if (!res) {
          dbg && console.log(msg, '[2]search?', search);
          return;
        }

        let iExisting = history.indexOf(search);
        if (iExisting < 0) {
          dbg && console.log(msg, '[2]history+', search);
          history.unshift(search);
          while (history.length > MAX_HISTORY) {
            let discard = history.pop();
            dbg && console.log(msg, '[3]history-', discard);
          }
          dbg && console.log(msg, '[4]res', res);
        }

        if (maxDefinitions && res.data.length>maxDefinitions) {
          res.data = res.data.slice(0,maxDefinitions);
          Object.assign(res.data[maxDefinitions-1], {
            meaning_1:"\u2026",
          });
        }
        if (!openNew) {
          this.dictResult = res;
          this.search = search;
          this.card.location[0] = search;
          for (let i=settings.cards.length; i-->0;) {
            let c = settings.cards[i];
            if (c.context !== EbtCard.CONTEXT_PALI) {
              continue;
            }
            if (c.id === card.id || c.location[0] !== search) {
              continue;
            }
            dbg && console.log(msg, '[5]removeCard', c);
            settings.removeCard(c, config);
          }
          settings.saveSettings();
        }
        window.location.hash = `#/${card.context}/${search}`;
      },
      updateModelValue(value) { // dropdown update
        const msg = "PaliView.updateModelValue()";
        const dbg = DBG.PALI_SEARCH;
        let { card, search, } = this;

        if (!value) {
          return;
        }

        if (value.endsWith('\u2026')) {
          nextTick(()=>{
            this.search = search = search.replace('\u2026', '');
            dbg && console.log(msg, '[1]\u2026', {value, search, });
          });
        } else {
          dbg && console.log(msg, '[2]value', value);
          this.runSearch({search});
        }
      },
      updateSearch(search) { // keyboard update
        const msg = "PaliView.updateSearch()";
        const dbg = DBG.PALI_SEARCH;
        let { volatile } = this;
        let { dictionary } = volatile;
        this.search = search;
        if (!search) {
          this.setItems(history);
          return;
        }

        if (dictionary) {
          let words = dictionary.wordsWithPrefix(search) || [];
          this.setItems([ ...history, ...words ]);
        }
      },
      setItems(strings) {
        const msg = "PaliView.setItems()";
        const dbgv = DBG.VERBOSE && DBG.PALI_SEARCH;
        let map = {};
        let newItems = strings.reverse()
          .filter(s=>{
            if (map[s]) {
              return false;
            }
            map[s] = true;
            return true;
          })
          .reverse();
        dbgv && console.log(msg, newItems);
        items.value = newItems;
      },
      onEnter(evt) {
        const msg = "PaliView.onEnter()";
        const dbg = DBG.PALI_SEARCH;
        let { card, search, volatile } = this;
        let { dictionary } = volatile;
        let res = search && dictionary && dictionary.find(search);
        if (!res) {
          dbg && console.log(msg, '[1]search?', search, evt);
          this.dictResult = undefined;
          nextTick(()=>{
            let id = this.idDpdLink;
            console.log(msg, '[1.1]id', id);
            volatile.focusCardElementId(card, id);
          });
          return;
        }
        let { ctrlKey } = evt;
        let openNew = ctrlKey;
        dbg && console.log(msg, '[2]entry', search, res, evt);
        this.runSearch({search, openNew});
        volatile.paliSearchCard = null;
      },
      groupDefinitions(group) {
        const msg = "PaliView.groupDefinitions()";
        let { word, construction, lemma } = group;
        let { dictResult } = this;
        let { method, pattern, data } = dictResult;
        return data.filter(d=>{
          return d.lemma === group.lemma;
        });
      },
    },
    async mounted() {
      const msg = 'PaliView.mounted()';
      let dbg = DBG.PALI_VIEW;
      let { card, $route, settings, volatile} = this;
      let { dictionary } = await volatile.verifyState();

      dbg && console.log(msg, '[1]dictionary', !!dictionary);
      let word = card.location[0] || '';
      if (word) {
        word = word.toLowerCase();
        let res = dictionary.find(word);
        dbg && console.log(msg, '[3]find', word);
        this.dictResult = res;
      } else {
        dbg && console.log(msg, '[4]search');
        volatile.paliSearchCard = card;
      }

      if (history.length === 0) {
        let { cards } = settings;
        for (let i=0; i<cards.length; i++) {
          let ci = cards[i]
          if (ci.context === EbtCard.CONTEXT_PALI) {
            history.push(ci.location[0]);
          }
        }
        dbg && console.log(msg, '[5]history', history);
        this.setItems(history);
      } else {
        dbg && console.log(msg, '[6]history!!!', history);
      }
      
      this.groups = await this.lemmaGroups();
      card.onAfterMounted({settings, volatile});
    },
    computed: {
      idDpdLink() {
        let { card, volatile } = this;
        return `${card.id}-dpd-link`;
      },
      showSearch() {
        let { card, volatile } = this;
        return card === volatile.paliSearchCard;
      },
      word() {
        return this.card.location[0];
      },
      async definition() {
        const msg = "PaliView.definition";
        let { card, volatile } = this;
        let { dictionary } = await volatile.verifyState();
        if (dictionary == null) {
          return [ '...', '...', '...', '...' ];
        }

        let word = card.location[0].toLowerCase();
        let entry = dictionary.entryOf(msg, word);
        let res = dictionary.find(word);
        let definitions = ['nothing'];
        if (entry) {
          definitions = entry.definition;
          definitions = entry.definition.map(def=>def.split('|'));
        } else {
          let type = '--';
          let meaning_1 = `${word} not found`;
          let literal = '--';
          let construction = '--';
          definitions = [ type, meaning_1, literal, construction ];
        }
        return definitions;
      },
    },
  }
</script>

<style>
.dict td {
  padding: 0.2em;
  padding-left: 0.5em;
}
.dict tr .dict-menu {
  opacity: 0.1;
  font-weight: 600;
}
.dict tr:hover .dict-menu {
  opacity: 1;
}
@media (max-width: 600px) {
  .dict tr .dict-menu {
    opacity: 1;
  }
}
.dict-pat {
  color: rgb(var(--v-theme-matched));
}
.dict-construction {
  padding-left: 1em;
  font-size: smaller;
  font-style: italic;
}
.dict-search {
  display: flex;
  flex-flow: column;
  align-items: center;
  width: 100%;
}
.dict-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.7em;
  max-width: 40em;
}
.dict-group-title {
}
.dict-group:hover {
  border-radius: 10px;
  background: linear-gradient(160deg, 
    rgb(var(--v-theme-currentbg)), 
    rgb(var(--v-theme-toolbar))
    ) !important;
}
.dict-group:hover .dict-menu {
  color: rgb(var(--v-theme-link));
}
</style>
