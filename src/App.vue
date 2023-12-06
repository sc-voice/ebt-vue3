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
              <div v-if="settings.logLevel==='info'" class="app-debug">
                <span title="activeElt">{{activeElt}}</span>
                &nbsp;
                <span title="routeCard">{{volatile.routeCard?.id}}</span>
                &nbsp;
                <span title="viewWidth">w{{viewWidth}}</span>
                &nbsp;
                <span title="legacyVoice">{{settings.legacyVoice}}</span>
                <span :title="volatile.waitingMsg">
                  wait{{volatile.waiting}}
                </span>
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
          <LegacyVoice />
          <Settings />
          <EbtCards v-if="settings?.cards?.length" />
        </div>
      </v-sheet>

      <v-sheet class="gdrp" v-if="settings.showGdpr">
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
        <Tutorial v-if="settings.tutorClose"
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
        ></Tutorial>
        <Tutorial v-if="!settings.tutorPlay && !settings.tutorSearch"
          setting="tutorSettings" 
          :title="$t('ebt.settingsTitle')" 
          :text="$t('ebt.customizeSettings')" arrow="top"
          :msDelay="10000"
        ></Tutorial>
      </div>
    </v-main>
  </v-app>
</template>

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
  import { 
    DEBUG_TUTORIAL, DEBUG_HOME, DEBUG_KEY, DEBUG_STARTUP, 
    DEBUG_CLICK, DEBUG_FOCUS, DEBUG_SCROLL 
  } from './defines.mjs';

  export default {
    inject: ['config'],
    setup() {
      return {
        tabs: ref([]),
        clickElt: ref(undefined),
        activeElt: ref("loading..."),
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
        let msg = 'App.onHome() ';
        let { settings, volatile, audio, config } = this;
        let dbg = DEBUG_HOME;
        audio.playBlock();

        let homePath = settings.homePath(config);
        let location = `${config.basePath}${homePath}`;
        dbg && console.log(msg, `[1]`, {location});
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
        const dbg = DEBUG_FOCUS || DEBUG_CLICK;
        let { settings, volatile, audio } = this;
        let btn = document.getElementById('btn-settings');
        btn && btn.blur();
        volatile.showSettings = true;
        settings.tutorSettings = false;
        nextTick(()=>{
          let autofocus = document.getElementById('settings-autofocus');
          dbg && console.log(msg, {autofocus});
          autofocus && autofocus.focus();
        });
      },
      onKeydown(evt) {
        let msg = `App.onKeydown:${evt.code}`;
        let dbg = DEBUG_KEY;
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
    },
    updated() {
      let msg = 'App.updated()';
      let { volatile } = this;
      let dbg = DEBUG_STARTUP;
      volatile.updated = true;
      dbg && console.log(msg);
    },
    async mounted() {
      let msg = 'App.mounted()';
      let { 
        $t, audio, config, $vuetify, settings, $i18n, volatile, 
        $route
      } = this;
      let dbg = settings.development && (
        DEBUG_STARTUP || DEBUG_FOCUS || DEBUG_SCROLL
      );
      volatile.$t = $t;
      volatile.config = config;

      let { hash } = window.location;

      // wait for Settings to load
      await settings.loadSettings(config);
      nextTick(()=>{
        let { clickElt } = this;
        audio.clickElt = clickElt;
        let { audioVolume } = settings;
        clickElt.volume = audioVolume;
      });

      let wikiHash = hash.startsWith("#/wiki") ? hash : null;
      let homePath = settings.homePath(config);
      let wikiCard = wikiHash
        ? settings.pathToCard(wikiHash)
        : settings.pathToCard(homePath);
      dbg && console.log(msg, '[1]', {wikiCard, $route});

      $vuetify.theme.global.name = settings.theme === 'dark' 
        ? 'dark' : 'light';;
      $i18n.locale = settings.locale;
      let onSettingsChanged = async (mutation, state) => {
        $vuetify.theme.global.name = settings.theme === 'dark' 
          ? 'dark' : 'light';
        dbg && console.log(msg, "[2]settings.onSettingsChanged()", 
          {mutation, state, settings});
        await settings.saveSettings();
        $i18n.locale = settings.locale;
      };
      this.unsubSettings = settings.$subscribe(onSettingsChanged);
      let that = this;
      window.addEventListener('keydown', (evt)=>this.onKeydown(evt));
      window.addEventListener('focusin', evt=>{
        let msg = 'App.mounted().focusin';
        let { audio } = this;
        if (evt.target.id === 'ebt-chips') {
          audio.playBlock();
        } else {
          audio.playClick();
        }
      });
      setInterval(()=>{
        let elt = window?.document?.activeElement;
        let activeElt = elt?.id || elt;
        if (activeElt !== that.activeElt) {
          that.activeElt = activeElt;
          dbg && console.log(msg, "[4]activeElt", {activeElt, elt});
        }
      }, 1000);
    },
    computed: {
      showTutorial(ctx) {
        const msg = "App.showTutorial";
        let { search } = window.location;
        let { settings } = ctx;
        let isSrcSC = search.search('src=sc') >= 0;
        let legacyAsk = settings.legacyVoice==='ask';
        let dbg = DEBUG_TUTORIAL;
        
        if (!settings.loaded) {
          dbg && console.log(msg, '[1]not loaded');
          return false;
        }
        if (settings.tutorialState(false)) {
          dbg && console.log(msg, '[2]completed');
          return false;
        }
        if (isSrcSC && settings.legacyVoice === 'new') {
          dbg && console.log(msg, '[3]legacy');
          return true;
        } 

        dbg && console.log(msg, '[4]standalone');
        return true;
      },
      showTutorWiki(ctx) {
        const msg = "App.showTutorWiki()";
        let { audio, settings, } = this;
        let { cards, tutorWiki } = settings;
        let dbg = DEBUG_TUTORIAL;
        let nOpen = cards.reduce((a,c,i)=>{
          if (c?.isOpen) {
            dbg && console.log(msg, '[1]isOpen', 
              c.id, c.context, c.location.join('/'));
            return a+1;
          }
          return a;
        }, 0);
        let inTutorial = !settings.tutorialState(false);
        let show = inTutorial && tutorWiki && nOpen === 0;
        dbg && console.log(msg, '[2]show',
          {nOpen, inTutorial, tutorWiki, show});
        return show;
      },
      showTutorPlay(ctx) {
        let { audio, settings, } = this;
        let { tutorWiki } = settings;
        let show = audio.audioScid && !tutorWiki;
        return show;
      },
      showTutorSearch(ctx) {
        let { audio, settings, } = this;
        let { tutorClose, tutorWiki, cards } = settings;
        let nOpen = cards.reduce((a,c,i)=> (c.isOpen ? a+1 : a), 0);
        let show = !audio.audioScid && 
          !tutorClose && !tutorWiki && 
          nOpen < 1;
        return show;
      },
      viewWidth(ctx) {
        return window?.innerWidth || root?.clientWidth;
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
</style>

