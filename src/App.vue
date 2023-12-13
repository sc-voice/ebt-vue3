<template>
  <v-app >
    <v-main >
      <v-app-bar flat 
        :extension-height="collapsed ? 0 : 40"
        :collapse="collapsed"
        density="compact"
        class="ebt-app-bar"
      >
        <template v-if="collapsed">
          <v-btn icon 
            @click="volatile.collapseAppBar=false" 
            class="pr-5"
          >
            <v-icon icon="mdi-arrow-expand-left" />
          </v-btn>
        </template> <!-- collapsed -->
        <template v-if="!collapsed">
          <v-app-bar-title>
            <div class="ebt-title">
              <v-icon icon="mdi-home" class="home-icon" size="24px"
                @click.stop="onHome"
              />
              <div :title="titlePopup">
                {{config.appName}}
              </div>
              <div class="app-debug">
                <span v-if="DBG_FOCUS" title="activeElt">
                  {{activeElt||'activeElt?'}}
                </span> &nbsp;
                <span v-if="DBG_ROUTE" title="routeCardId">
                  {{settings.routeCardId}}
                </span> &nbsp;
                <span v-if="DBG_SCROLL" title="viewWidth x viewHeight">
                  {{viewWidth}}x{{viewHeight}}
                </span> &nbsp;
                <span v-if="DBG_LEGACY" 
                  title="legacyVoice:showLegacyDialog">
                  {{settings.legacyVoice}}:
                  {{volatile.showLegacyDialog ? 'legacy' : 'nolegacy'}}
                </span> &nbsp;
                <span v-if="DBG_WAITING" :title="volatile.waitingMsg">
                  wait:{{volatile.waiting}}
                </span> &nbsp;
              </div>
            </div>
          </v-app-bar-title>
          <div class="pr-3">
            <v-btn id='btn-search' icon @click="onClickSearch" >
              <v-icon icon="mdi-magnify"/>
            </v-btn>
            <v-btn id='btn-settings' icon @click="onClickSettings">
              <v-icon icon="mdi-cog"/>
            </v-btn>
          </div>
        </template>
        <template v-if="!collapsed" v-slot:extension>
          <ebt-chips />
        </template> <!-- !collapsed -->
        <template v-if="settings.loaded">
          <audio 
            :ref="el => {clickElt = el}" preload=auto>
            <source type="audio/mp3" :src="settings.clickUrl()" />
            <p>{{$t('ebt.noHTML5')}}</p>
          </audio>
        </template>
      </v-app-bar>
      <v-sheet>
        <div>
          <ebt-processing />
          <LegacyVoice v-if="settings.loaded"/>
          <Settings />
          <EbtCards v-if="settings?.cards?.length" />
          <div v-if="DBG_LOG_HTML" class="app-log">
            <div v-for="item in volatile.logHtml" class="app-log-item">
              <div class="app-log-count">
                {{item.count === 1 ? ' ' : `${item.count}x`}}
              </div>
              <div class="app-log-text">{{item.line}}</div>
            </div>
          </div>
        </div>
      </v-sheet>

      <v-sheet class="gdrp" v-if="showGdpr">
        {{$t('ebt.allowSettings')}}
        <a :href="privacyLink">{{$t('ebt.allowSettingsLink')}}</a>
        <v-icon icon="mdi-close-circle" 
          class="ml-2"
          @click="onClickGdrp"/>
      </v-sheet>

      <v-snackbar v-model="volatile.showAlertMsg" 
        color="alert" 
        height="300px"
        timeout=-1
      >
        <div class="alert-title"> 
          {{ alertTitle }}
          <v-btn color="alert"
            icon="mdi-close"
            @click="volatile.alert(null)"
          />
        </div>
        <div class="alert-body">
          <div class="alert-msg">{{ alertMsg }}</div>
          <div v-html="alertHtml" class="alert-html"/>
        </div>
      </v-snackbar>
      <div v-if="showTutorial">
        <Tutorial v-if="showTutorClose"
          setting="tutorClose" :title="$t('ebt.closeCard')" 
          containerId="home-card-id" 
          :text="$t('ebt.closeWiki')" arrow="top"
          :msDelay="5000"
        ></Tutorial>
        <Tutorial v-if="showTutorWiki"
          setting="tutorWiki" :title="$t('ebt.show')" 
          :text="$t('ebt.openWiki')" arrow="top" hflip 
          :msDelay="1000"
        ></Tutorial>
        <Tutorial v-if="showTutorSearch"
          setting="tutorSearch" :title="$t('ebt.search')" 
          :text="$t('ebt.findSutta')" arrow="top" 
          :msDelay="1000"
        ></Tutorial>
        <Tutorial v-if="showTutorPlay"
          setting="tutorPlay" :title="$t('ebt.ariaPlay')" 
          :text="$t('ebt.hearSutta')" arrow="bottom" hflip
          :msDelay="2000"
        ></Tutorial>
        <Tutorial v-if="showTutorSettings"
          setting="tutorSettings" 
          :title="$t('ebt.settingsTitle')" 
          :text="$t('ebt.customizeSettings')" arrow="top"
          :msDelay="5000"
        ></Tutorial>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
  import { 
    DBG_TUTORIAL, DBG_HOME, DBG_KEY, DBG_STARTUP, 
    DBG_LEGACY, DBG_CLICK, DBG_FOCUS, DBG_SCROLL,
    DBG_ROUTE, DBG_WAITING, DBG_SETTINGS, DBG_LOG_HTML,
    DBG_GDPR, DBG_MOUNTED, DBG_WIKI, DBG_AUDIO
  } from './defines.mjs';

  const msg = "App.setup"
  const dbg = DBG_FOCUS;

  const activeElt = ref("loading...");
  setInterval(()=>{
    let elt = window?.document?.activeElement;
    let aeNew = elt?.id || elt;
    let aeOld = activeElt.value;
    if (aeNew !== aeOld) {
      dbg && console.log(msg, "[4]activeElt", {aeNew, aeOld});
      activeElt.value = aeNew;
    } else {
      //dbg && console.log(msg, "[5]activeElt", ae);
    }
  }, 1000);
</script>
<script>
  import { default as HomeView } from './components/HomeView.vue';
  import Tutorial from './components/Tutorial.vue';
  import EbtCard from './ebt-card.mjs';
  import EbtCards from './components/EbtCards.vue';
  import EbtChips from './components/EbtChips.vue';
  import Settings from './components/Settings.vue';
  import EbtProcessing from './components/EbtProcessing.vue';
  import LegacyVoice from './components/LegacyVoice.vue';
  import { useSettingsStore } from './stores/settings.mjs';
  import { useVolatileStore } from './stores/volatile.mjs';
  import { useAudioStore } from './stores/audio.mjs';
  import { logger } from "log-instance/index.mjs";
  import { nextTick, ref } from "vue";

  export default {
    inject: ['config'],
    setup() {
      return {
        tabs: ref([]),
        clickElt: ref(undefined),
      }
    },
    data: ()=>({
      audio: useAudioStore(),
      settings: useSettingsStore(),
      volatile: useVolatileStore(),
      unsubSettings: undefined,
      swipe: 'loading',
    }),
    components: {
      HomeView,
      EbtCards,
      EbtChips,
      Settings,
      EbtProcessing,
      LegacyVoice,
      Tutorial,
    },
    methods: {
      onHome(evt) {
        let msg = 'App.onHome()';
        let { settings, volatile, audio, config } = this;
        let dbg = DBG_HOME;
        audio.playBlock();
        let { cards } = settings;
        let homeCard = settings.wikiCard;
        if (!homeCard?.isOpen) {
          dbg && console.log(msg, `[1]open`, homeCard.debugString);
          homeCard.open(true);
        }
        volatile.setRouteCard(homeCard);
        let homePath = settings.homePath(config);
        let location = `${config.basePath}${homePath}`;

        dbg && console.log(msg, `[2]`, {location});
        window.location = location;
        volatile.ebtChips && nextTick(()=>{
          dbg && console.log(msg, `[2]ebtChips.focus()`);
          volatile.ebtChips.focus();
        });
      },
      async allowLocalStorage() {
        let { settings } = this;
        await settings.saveSettings();
        logger.debug("allowLocalStorage()", settings);
      },
      onClickGdrp(evt) {
        let { audio, settings } = this;
        logger.debug('onClickGdrp', evt);
        settings.showGdpr = false;
        evt.preventDefault();
      },
      onClickSearch(evt) {
        let { settings } = this;
        window.location = "#/search";
        settings.tutorSearch = false;
      },
      onClickSettings(evt) {
        const msg = "App.onClickSettings()";
        const dbg = DBG_FOCUS || DBG_CLICK;
        let { settings, volatile, audio, config } = this;
        let btn = document.getElementById('btn-settings');
        btn && btn.blur();
        volatile.showSettings = true;
        if (settings.tutorSettings) { // tutorial is all done
          settings.tutorSettings = false;
          volatile.setRoute(config.homePath);
        }
        nextTick(()=>{
          let autofocus = document.getElementById('settings-autofocus');
          dbg && console.log(msg, {autofocus});
          autofocus && autofocus.focus();
        });
      },
      onKeydown(evt) {
        let msg = `App.onKeydown:${evt.code}`;
        let dbg = DBG_KEY;
        let { audio } = this;
        switch (evt.code) {
          case 'Home': 
            dbg && console.log(msg, '[3]onHome', {evt}); 
            this.onHome(evt); 
            break;
          default: 
            dbg && console.log(msg, '[4]', {evt}); 
            break;
        }
      },
      async onSettingsChanged(mutation, state) {
        const msg = "App.onSettingsChanged()";
        const dbg = DBG_SETTINGS;
        let { settings, $i18n, $vuetify } = this;
        $vuetify.theme.global.name = settings.theme === 'dark' 
          ? 'dark' : 'light';
        dbg && console.log(msg, {mutation, state, settings});
        await settings.saveSettings();
        $i18n.locale = settings.locale;
      },
    },
    created() {
      const msg = "App.created()";
      const dbg = true || DBG_STARTUP;
      let { volatile } = this;

      if (DBG_LOG_HTML) {
        dbg && console.log(msg, '[1]enableLog');
        volatile.enableLog(true);
      }
    },
    updated() {
      let msg = 'App.updated()';
      let { volatile } = this;
      let dbg = DBG_STARTUP;
      volatile.updated = true;
      dbg && console.log(msg);
    },
    async mounted() {
      const msg = 'App.mounted()';
      const dbg = DBG_MOUNTED || DBG_WIKI;
      let { 
        $t, audio, config, $vuetify, settings, $i18n, volatile, 
        $route
      } = this;
      volatile.$t = $t;
      volatile.config = config;

      let { hash } = window.location;

      // wait for Settings to load
      await settings.loadSettings(config);
      setTimeout(()=>{
        let { clickElt } = this;
        audio.clickElt = clickElt;
        let { audioVolume } = settings;
        clickElt && (clickElt.volume = audioVolume);
      }, 2000);

      let wikiHash = hash.startsWith("#/wiki") ? hash : null;
      let homePath = settings.homePath(config);
      let wikiCard = wikiHash
        ? settings.pathToCard(wikiHash)
        : settings.pathToCard(homePath);
      dbg && console.log(msg, '[1]wikiCard', wikiCard?.debugString);

      $vuetify.theme.global.name = settings.theme === 'dark' 
        ? 'dark' : 'light';;
      $i18n.locale = settings.locale;
      this.unsubSettings = settings.$subscribe((mutation,state)=>{
        this.onSettingsChanged(mutation,state);
      });
      let that = this;
      window.addEventListener('keydown', (evt)=>this.onKeydown(evt));
      window.addEventListener('focusin', evt=>{
        const msg = 'App.mounted().focusin';
        const dbg = DBG_AUDIO;
        let { audio } = this;
        if (evt.target.id === 'ebt-chips') {
          dbg && console.log(msg, '[1]playBlock');
          audio.playBlock();
        } else {
          dbg && console.log(msg, '[1]playClick');
          audio.playClick();
        }
      });
    },
    computed: {
      showGdpr(ctx) {
        const msg = "App.showGdpr"
        const dbg = DBG_GDPR;
        let { settings, volatile } = this;
        let { loaded } = settings;
        let { showLegacyDialog } = volatile;
        let { showGdpr } = settings;

        if (!loaded) {
          dbg && console.log(msg, '[1]wait', {loaded});
          return false;
        }
        if (!showGdpr) {
          dbg && console.log(msg, '[2]hide', {showGdpr});
          return false;
        }
        if (showLegacyDialog) {
          dbg && console.log(msg, '[3]wait', {showLegacyDialog});
          return false;
        }
        let inTutorial = !settings.tutorialState(false);
        if (inTutorial) {
          dbg && console.log(msg, '[4]wait', {inTutorial});
          return false;
        }

        dbg && console.log(msg, '[5]show');
        return true;
      },
      showTutorial(ctx) {
        const msg = "App.showTutorial";
        let { search } = window.location;
        let { volatile, settings } = ctx;
        let { loaded:settingsLoaded } = settings;
        let { showSettings, showLegacyDialog } = volatile;
        let dbg = DBG_TUTORIAL;
        
        if (!settings.loaded) {
          dbg && console.log(msg, '[1]wait', {settingsLoaded});
          return false;
        }
        if (showSettings) {
          //dbg && console.log(msg, '[2]wait', {showSettings});
          return false;
        }
        if (settings.tutorialState(false)) {
          dbg && console.log(msg, '[3]completed');
          return false;
        }
        if (showLegacyDialog) {
          dbg && console.log(msg, '[4]wait', {showLegacyDialog});
          return false;
        } 

        dbg && console.log(msg, '[5]show');
        return true;
      },
      showTutorSettings(ctx) {
        const msg = "App.showTutorSettings()";
        const dbg = DBG_TUTORIAL;
        let { settings } = this;
        let { 
          tutorSettings, tutorPlay, tutorSearch, 
          tutorWiki, tutorClose, openCards, wikiCard,
        } = settings;

        if (!tutorSettings) {
          dbg && console.log(msg, '[1]done', {tutorSettings});
          return false;
        }
        if (tutorPlay) {
          dbg && console.log(msg, '[2]wait', {tutorPlay});
          return false;
        }
        if (tutorSearch) {
          dbg && console.log(msg, '[3]wait', {tutorSearch});
          return false;
        }
        if (tutorWiki) {
          dbg && console.log(msg, '[4]wait', {tutorWiki});
          return false;
        }
        if (tutorClose) {
          dbg && console.log(msg, '[5]wait', {tutorClose});
          return false;
        }

        // Tutorial popups interfere with links, so don't
        // allow other open cards
        let nonWikiOpen = openCards.filter(c=>c !== wikiCard).length; 
        if (nonWikiOpen) {
          dbg && console.log(msg, '[6]wait', {nonWikiOpen});
          return false;
        }

        dbg && console.log(msg, '[7]show');
        return true;
      },
      showTutorWiki(ctx) {
        const msg = "App.showTutorWiki()";
        const dbg = DBG_TUTORIAL;
        let { audio, settings, } = this;
        let { 
          wikiCard, openCards, tutorWiki, tutorPlay 
        } = settings;
        if (!tutorWiki) {
          dbg && console.log(msg, '[1]done');
          return false;
        }

        let { segmentPlaying } = audio;
        if (segmentPlaying) {
          dbg && console.log(msg, '[2]wait', 
            segmentPlaying && "segmentPlaying",
            tutorPlay && "tutorPlay");
          return false;
        }

        // Tutorial popups interfere with links, so don't
        // allow other open cards
        let nonWikiOpen = openCards.filter(c=>c !== wikiCard).length;
        if (nonWikiOpen) {
          dbg && console.log(msg, '[4]wait', {nonWikiOpen});
          return false;
        }

        dbg && console.log(msg, '[5]show');
        return true;
      },
      showTutorPlay(ctx) {
        const msg = "App.showTutorPlay()";
        const dbg = DBG_TUTORIAL;
        let { audio, settings, } = this;
        let { tutorPlay, tutorWiki } = settings;
        let { audioScid } = audio;
        if (!tutorPlay) {
          dbg && console.log(msg, '[1]done', {tutorPlay});
          return false;
        }
        if (!audioScid) {
          dbg && console.log(msg, '[2]wait', {audioScid});
          return false;
        }
        dbg && console.log(msg, '[3]show');
        return true;
      },
      showTutorSearch(ctx) {
        const msg = "App.showTutorSearch()";
        const dbg = DBG_TUTORIAL;
        let { audio, settings, } = this;
        let { tutorSearch, tutorClose, tutorWiki, cards } = settings;

        if (!tutorSearch) {
          dbg && console.log(msg, '[1]done', {tutorSearch});
          return false;
        }

        if (tutorClose || tutorWiki) {
          dbg && console.log(msg, '[2]wait', {tutorClose, tutorWiki});
          return false;
        }

        // Tutorial popups interfere with links, so don't
        // allow other open cards
        let nOpen = cards.reduce((a,c,i)=> {
          if (c.isOpen && c.context !== EbtCard.CONTEXT_WIKI) {
            return a+1 ;
          }
          return a;
        }, 0);
        let { audioScid } = audio;
        if (audioScid || nOpen > 0) {
          dbg && console.log(msg, '[3]wait', {nOpen, audioScid});
          return false;
        }

        dbg && console.log(msg, '[4]show');
        return true;
      },
      showTutorClose(ctx) {
        const msg = "App.showTutorClose()";
        const dbg = DBG_TUTORIAL;
        let { settings, } = this;
        let { tutorClose, tutorWiki, cards } = settings;
        let wikiCard = cards.reduce((a,card)=>{
          return card.context === EbtCard.CONTEXT_WIKI ? card : a;
        }, null);
        if (!tutorClose) {
          dbg && console.log(msg, '[1]done', {tutorClose});
          return false;
        }
        if (!wikiCard || !wikiCard.isOpen) {
          dbg && console.log(msg, '[2]wait:wiki card hidden');
          return false;
        }

        dbg && console.log(msg, '[3]show');
        return true;
      },
      viewWidth(ctx) {
        return window?.innerWidth || root?.clientWidth;
      },
      viewHeight(ctx) {
        return window?.innerHeight || root?.clientHeight;
      },
      collapsed(ctx) {
        let { volatile } = this;
        return volatile.collapseAppBar;
      },
      titlePopup(ctx) {
        let { settings } = this;
        return `SuttaCentral Voice / ${settings.langTrans}`;
      },
      privacyLink(ctx) {
        let { config } = ctx;
        return config.privacyLink || "#/wiki/privacy";
      },
      alertHtml(ctx) {
        return ctx.volatile.alertHtml;
      },
      alertTitle(ctx) {
        let { $t } = ctx;
        let titleKey = ctx.volatile.alertMsg?.context || 
          'ebt.applicationError';
        return $t(titleKey);
      },
      alertMsg(ctx) {
        return ctx.volatile.alertMsg?.msg;
      },
      displayBox(ctx) {
        return ctx.volatile.displayBox.value;
      },
    },
  }
</script>
<style>
.ebt-app-bar {
  background: 
    linear-gradient(130deg, #000, rgb(var(--v-theme-toolbar)))
    !important;
}
.gdrp {
  position: fixed;
  color: rgb(var(--v-theme-chip));
  bottom: 0;
  right: 0;
  opacity: 1;
  padding: 2pt;
  border-top: 1pt solid rgb(var(--v-theme-chip));
  border-left: 1pt solid rgb(var(--v-theme-chip));
  border-radius: 3pt;
}
.v-toolbar-title {
  margin-left: 0px;
  min-width: 10em;
}
.v-toolbar--collapse {
  width: 50px !important;
  left: unset !important;
  right: 0px;
  border: 1pt solid rgba(var(--v-theme-toolbar), 0.5);
  border-bottom-right-radius: 0px;
  border-bottom-left-radius: 24px;
}
.ebt-nav-img {
  display: relative;
  height: 35px;
  cursor: pointer;
  margin-right: 5px;
  border: 1pt solid rgb(0,0,0);
  border-radius: 5px;
}
.ebt-title {
  display: flex;
  align-items: center;
  font-size: min(20px, 4vw);
}
.ebt-title:focus-within a {
  border: none !important;
  outline: none;
}
.ebt-title:focus-within img {
  font-size: 1.5rem !important;
  border: 1pt dashed rgb(var(--v-theme-chip));
}
.app-menu-activator {
  padding-right: 10px;
}
.app-menu-items {
  display: flex;
  height: 50px !important;
  flex-flow: row nowrap ;
  border: 1px solid rgb(var(--v-theme-on-surface));
  border-radius: 10px !important;
  border-top-right-radius: 0px !important;
  background: rgba(var(--v-theme-surface), 0.5);
}
.alert-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: larger;
  font-variant-caps: all-small-caps;
  font-weight: 600;
  border-bottom: 1pt solid rgba(var(--v-theme-on-surface), 0.5);
}
.alert-body {
  min-height: 40px;
}
.alert-msg {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  line-height: 1.2em;
  max-width: 300px;
  text-overflow: '';
}
.alert-html{
  font-size: 11px;
  line-height: 1.2em;
  border-left: 1pt solid orange;
  padding-left: 1em;
}
.home-icon {
  margin-bottom: 0.2em;
  margin-right: 0.2em;
}
.app-debug{
  margin-left: 0.5em;
  font-size: 12px;
}
.debug-swipe{
  height: 4em;
  width: 100%;
  border: 1pt solid red;
}
.app-log {
  display: flex;
  flex-flow: column;
  border: 1pt solid aqua;
  padding: 0.5em;
  font-family: sans;
  color: rgba(255,255,255, 0.5);
}
.app-log div:hover{
  color: rgb(255,255,80);
  background-color: black;
}
.app-log-count {
  display: inline-block;
  width: 1.5em;
}
.app-log-text {
  display: inline-block;
}
</style>

