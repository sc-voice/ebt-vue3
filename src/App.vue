<template>
  <v-app >
    <v-main >
      <v-app-bar flat 
        :extension-height="collapsed ? 0 : APP_BAR_H"
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
            <div :class="startupClass('ebt-title')" 
              @click="onClickAppBar">
              <v-icon icon="mdi-home" class="home-icon" size="24px"
                @click.stop.prevent="appHome"
              />
              <div :title="titlePopup">
                {{config.appName}}
              </div>
              <div class="app-dbg-container">
                <div class="app-dbg" v-if="DBG.AUDIO_SCID"
                  title="audioScid">
                  {{ `${audio.audioScid}@${audio.audioIndex}` }}
                </div>
                <div class="app-dbg" v-if="DBG.FOCUS_ELT"
                  :title="'activeElt '+activeElt">
                  {{ activeElt||'activeElt?'}}
                </div>
                <div v-if="DBG.FOCUS">
                  {{docHasFocus}}
                  <div class="app-dbg" 
                    :title="'appFocus '+volatile.appFocus?.id">
                    {{volatile?.appFocus?.id||volatile?.appFocus}}
                  </div>
                </div> 
                <div  v-if="DBG.ROUTE" 
                  class="app-dbg" title="routeCard.id">
                  {{volatile.routeCard?.id}}
                </div >
                <div v-if="DBG.SCROLL" 
                  class="app-dbg" 
                  title="viewWidth x viewHeight">
                  {{viewWidth}}x{{viewHeight}}
                </div>
                <div v-if="DBG_WAITING" 
                  class="app-dbg"
                  :title="volatile.waitingMsg">
                  wait:{{volatile.waiting}}
                </div>
              </div>
            </div><!-- ebt-title -->
            <div :class="startupClass('sc-voice')">
              sc-voice.net/{{docLang.toLowerCase()}}
            </div>
          </v-app-bar-title>
          <div :class="startupClass('app-btns')">
            <v-btn id='btn-pali' icon 
              :title="$t('ebt.openPaliCard')"
              @click="onClickPali" 
              @focus="onFocusBtn"
            >
              <v-icon icon="mdi-book-information-variant"/>
            </v-btn>
            <v-btn id='btn-search' icon 
              :title="$t('ebt.openSearchCard')"
              @click="onClickSearch" 
              @focus="onFocusBtn"
            >
              <v-icon icon="mdi-magnify"/>
            </v-btn>
            <v-btn id='btn-settings' icon 
              :title="$t('ebt.openSettings')"
              @click="onClickSettings"
              @focus="onFocusBtn"
              class="pr-1"
            >
              <v-icon icon="mdi-cog"/>
            </v-btn>
          </div>
        </template>
        <template v-slot:extension >
          <ebt-chips v-if="!collapsed" />
        </template> <!-- !collapsed -->
        <template v-if="settings.loaded">
          <audio id="audio-click"
            :ref="el => audio.registerClickElt(el)" preload=auto>
            <source type="audio/mp3" :src="settings.clickUrl()" />
            <p>{{$t('ebt.noHTML5')}}</p>
          </audio>
        </template>
      </v-app-bar>
      <v-sheet id="app-body">
        <div>
          <ebt-processing />
          <Settings />
          <EbtCards v-if="isReady"/>
          <div v-if="volatile.showHtmlLog" class="app-log">
            <v-icon icon="mdi-trash-can" @click="volatile.clearLog" />
            <div v-for="item in volatile.logHtml" class="app-log-item">
              <div class="app-log-count">
                {{item.count === 1 ? '&nbsp;' : `${item.count}x`}}
              </div>
              {{item.line}}
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

      <v-snackbar 
        color="tutorial"
        v-model="volatile.showTransientMsg"
        close-on-content-click
        content-class="transient-msg"
        timeout="700"
      >
        {{volatile.transientMsg}}
      </v-snackbar>
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
        <v-dialog v-model="settings.tutorAsk" width="auto"
          persistent
        >
          <v-card
            max-width="400"
            color="tutorial"
            prepend-icon="mdi-school-outline"
            style="color: yellow !important;"
            :text="$t('ebt.showTutorial')"
            :title="$t('ebt.tutorial')"
          >
            <template v-slot:actions>
              <v-btn
                class="ms-auto"
                icon="mdi-close"
                @click="onTutorAsk(false)"
              ></v-btn>
              <v-spacer />
              <v-btn
                class="ms-auto"
                icon="mdi-check"
                @click="onTutorAsk(true)"
              ></v-btn>
            </template>
          </v-card>
        </v-dialog>
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
          :msDelay="3000"
        ></Tutorial>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
  import { onUpdated } from "vue";
  import { useVolatileStore } from './stores/volatile.mjs';
  import { 
    DBG,
    DBG_HOME, DBG_KEY, DBG_STARTUP, 
    DBG_LEGACY, DBG_CLICK, 
    DBG_WAITING, 
    DBG_GDPR, DBG_WIKI, DBG_AUDIO,

    APP_BAR_H,
  } from './defines.mjs';

  const msg = "App.setup"
  const dbg = DBG.FOCUS;
  const dbgv = DBG.VERBOSE && dbg;

  const activeElt = ref("loading...");
  const docHasFocus = ref("?");
  setInterval(()=>{
    let document = window?.document;
    let elt = document?.activeElement;
    let aeNew = elt?.id || elt;
    let aeOld = activeElt.value;
    if (aeNew !== aeOld) {
      dbg && console.log(msg, `[4]activeElt`, {aeOld, aeNew});
      activeElt.value = aeNew;
    } else {
      dbgv && console.log(msg, "[5]activeElt", aeNew);
    }
    docHasFocus.value = document && document.hasFocus() 
      ? "+" : "-";

  }, 1000);
</script>
<script>
  import { default as HomeView } from './components/HomeView.vue';
  import Tutorial from './components/Tutorial.vue';
  import EbtCard from './ebt-card.mjs';
  import CardFactory from './card-factory.mjs';
  import EbtCards from './components/EbtCards.vue';
  import EbtChips from './components/EbtChips.vue';
  import Settings from './components/Settings.vue';
  import EbtProcessing from './components/EbtProcessing.vue';
  import { useSettingsStore } from './stores/settings.mjs';
  import { useAudioStore } from './stores/audio.mjs';
  import { 
    Dictionary,
  } from "@sc-voice/ms-dpd";
  import { logger } from "log-instance/index.mjs";
  import { nextTick, ref } from "vue";

  const tabs = ref([]);

  export default {
    inject: ['config'],
    setup() {
      return {
        tabs,
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
      Tutorial,
    },
    methods: {
      onTutorAsk(value) {
        const msg = "App.onTutorAsk()";
        const dbg = DBG.TUTORIAL;
        let { volatile, settings } = this;
        dbg && console.log(msg, settings.tutorAsk);
        settings.tutorAsk = false;
        volatile.showTutorials(value);
      },
      startupClass(className) {
        let { settings, } = this;
        return settings.loaded
          ? `${className} ${className}-end`
          : `${className} ${className}-start`;
      },
      onFocusIn(evt) {
        const msg = 'App.onFocusIn()';
        const dbg = DBG.FOCUS || DBG_AUDIO;
        let { audio } = this;
        if (evt.target.id === 'ebt-chips') {
          dbg && console.log(msg, '[1]playBlock');
          audio.playBlock();
        } else {
          //dbg && console.log(msg, '[2]playClick');
          //audio.playClick();
        }
      },
      onFocusBtn(evt) {
        const msg = 'App.onFocusBtn()';
        const dbg = DBG.FOCUS;
        let { volatile } = this;
        let appFocus = evt.target;
        dbg && console.log(msg, '[1]appFocus', appFocus.id);
        volatile.appFocus = appFocus;
      },
      onClickAppBar(evt) {
        const msg = "App.onClickAppBar";
        const dbg = DBG_CLICK || DBG.FOCUS;
        let { volatile } = this;
        let { ebtChips } = volatile;
        if (ebtChips) {
          dbg && console.log(msg, '[1]focus', {evt});
          volatile.focusElement(ebtChips);
        } else {
          console.warn(msg, '[1]ebtChips?', {evt});
        }
      },
      onClickExtension(evt) {
        const msg = "App.onClickExtension";
        const dbg = DBG_CLICK || DBG.FOCUS;
        let { volatile } = this;
        let { ebtChips } = volatile;
        if (ebtChips) {
          dbg && console.log(msg, '[1]focus', {evt});
          volatile.focusElement(ebtChips);
        } else {
          console.warn(msg, '[1]ebtChips?', {evt});
        }
      },
      appHome(evt) {
        let msg = 'App.appHome()';
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
        dbg && console.log(msg, `[2]ctrl-Home`, location, evt);
        window.location = location;

        volatile.ebtChips && nextTick(()=>{
          dbg && console.log(msg, `[3]focusElement ebt-chips`);
          volatile.focusElement(volatile.ebtChips);
        });

        let ebtCards = document.getElementById("ebt-cards");
        if (ebtCards) {
          DBG.SCROLL && console.log(msg, '[4]scrollIntoView' );
          ebtCards.scrollIntoView(true);
        }
      },
      onHome(evt) {
        let msg = 'App.onHome()';
        let { settings, volatile, audio, config } = this;
        let dbg = DBG_HOME;
        if (evt.ctrlKey) {
          this.appHome(evt);
        }
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
      onClickPali(evt) {
        let { settings } = this;
        window.location = "#/pali";
      },
      onClickSettings(evt) {
        const msg = "App.onClickSettings()";
        const dbg = DBG.FOCUS || DBG_CLICK;
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
          autofocus && volatile.focusElement(autofocus);
        });
      },
      onKeydown(evt) {
        let msg = `App.onKeydown:${evt.key}`;
        let dbg = DBG_KEY;
        let { audio } = this;
        switch (evt.key) {
          case 'Home': 
            dbg && console.log(msg, '[1]onHome', {evt}); 
            this.onHome(evt); 
            break;
          case 'Escape':
            dbg && console.log(msg, '[2]Escape', {evt}); 
            break;
          default: 
            dbg && console.log(msg, `[3]${evt.code}`, {evt}); 
            break;
        }
      },
      async onSettingsChanged(mutation, state) {
        const msg = "App.onSettingsChanged()";
        const dbg = DBG.SETTINGS;
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
      const dbg = DBG_STARTUP;
      let { volatile } = this;

      if (DBG.LOG_HTML) {
        dbg && console.log(msg, '[1]enableLog');
        volatile.enableLog(true);
      }
    },
    async mounted() {
      const msg = 'App.mounted()';
      const dbg = DBG.APP_MOUNTED;
      let { 
        $t, audio, config, $vuetify, settings, $i18n, volatile, 
        $route, 
      } = this;
      volatile.$t = $t;
      volatile.config = config;

      let { hash } = window.location;

      // wait for Settings to load
      await settings.loadSettings(config);
      setTimeout(()=>{
        let { clickElt } = audio;
        if (clickElt) {
          let { audioVolume } = settings;
          dbg && console.log(msg, '[2]volume', audioVolume);
          clickElt.volume = audioVolume;
        } else {
          console.warn(msg, '[3]clickElt?', clickElt);
        }
      }, 2000);

      let wikiHash = hash.startsWith("#/wiki") ? hash : null;
      let homePath = settings.homePath(config);
      let cardFactory = CardFactory.singleton;
      let addCard = (opts=>cardFactory.addCard(opts));
      let wikiCard = wikiHash
        ? cardFactory.pathToCard({path:wikiHash, addCard})
        : cardFactory.pathToCard({path:homePath, addCard});
      dbg && console.log(msg, '[4]wikiCard', wikiCard?.debugString);

      $vuetify.theme.global.name = settings.theme === 'dark' 
        ? 'dark' : 'light';;
      $i18n.locale = settings.locale;
      this.unsubSettings = settings.$subscribe((mutation,state)=>{
        this.onSettingsChanged(mutation,state);
      });
      let that = this;
      window.addEventListener('keydown', evt=>this.onKeydown(evt));
      window.addEventListener('focusin', evt=>this.onFocusIn(evt));
    },
    computed: {
      async isReady(ctx) {
        const msg = "App.isReady";
        const dbg = DBG.IS_READY;
        let { volatile, settings } = this;

        if (!settings.loaded) {
          dbg && console.log(msg, '[1]settings.loaded', false);
          return false;
        }
        if (!settings?.cards?.length) {
          dbg && console.log(msg, '[2]cards', false);
          return result;
        }

        dbg && console.log(msg, '[3]volatile.verifyState');
        await volatile.verifyState();

        dbg && console.log(msg, '[4]ok', true);
        return true;
      },
      docLang(ctx) {
        let { settings, } = ctx;
        return settings.docLang.toUpperCase();
      },
      showGdpr(ctx) {
        const msg = "App.showGdpr"
        const dbg = DBG_GDPR;
        let { settings, volatile } = ctx;
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

        dbg && console.log(msg, '[5]show');
        return true;
      },
      showTutorial(ctx) {
        const msg = "App.showTutorial";
        let { search } = window.location;
        let { volatile, settings } = ctx;
        let { loaded:settingsLoaded } = settings;
        let { showSettings, showLegacyDialog } = volatile;
        let dbg = DBG.TUTORIAL;
        let dbgv = dbg && DBG.VERBOSE;
        
        if (!settings.loaded) {
          dbgv && console.log(msg, '[1]wait', {settingsLoaded});
          return false;
        }
        if (showSettings) {
          //dbgv && console.log(msg, '[2]wait', {showSettings});
          return false;
        }
        if (settings.tutorialState(false)) {
          dbgv && console.log(msg, '[3]completed');
          return false;
        }
        if (showLegacyDialog) {
          dbgv && console.log(msg, '[4]wait', {showLegacyDialog});
          return false;
        } 

        dbgv && console.log(msg, '[5]show');
        return true;
      },
      showTutorSettings(ctx) {
        const msg = "App.showTutorSettings()";
        const dbg = DBG.TUTORIAL;
        const dbgv = dbg && DBG.VERBOSE;
        let { settings } = this;
        let { 
          tutorSettings, tutorPlay, tutorSearch, 
          tutorWiki, tutorClose, openCards, wikiCard,
        } = settings;

        if (!tutorSettings) {
          dbgv && console.log(msg, '[1]done', {tutorSettings});
          return false;
        }
        if (tutorPlay) {
          dbgv && console.log(msg, '[2]wait', {tutorPlay});
          return false;
        }
        if (tutorSearch) {
          dbgv && console.log(msg, '[3]wait', {tutorSearch});
          return false;
        }
        if (tutorWiki) {
          dbgv && console.log(msg, '[4]wait', {tutorWiki});
          return false;
        }
        if (tutorClose) {
          dbgv && console.log(msg, '[5]wait', {tutorClose});
          return false;
        }

        // Tutorial popups interfere with links, so don't
        // allow other open cards
        let nonWikiOpen = openCards.filter(c=>c !== wikiCard).length; 
        if (nonWikiOpen) {
          //Settings doesn't use links
          //dbgv && console.log(msg, '[6]wait', {nonWikiOpen});
          //return false;
        }

        dbgv && console.log(msg, '[7]show');
        return true;
      },
      showTutorWiki(ctx) {
        const msg = "App.showTutorWiki()";
        const dbg = DBG.TUTORIAL;
        const dbgv = dbg && DBG.VERBOSE;
        let { audio, settings, } = this;
        let { 
          wikiCard, openCards, tutorWiki, tutorPlay, tutorAsk,
        } = settings;
        if (tutorAsk) {
          dbgv && console.log(msg, '[0]tutorAsk');
          return false;
        }
        if (!tutorWiki) {
          dbgv && console.log(msg, '[1]done');
          return false;
        }

        let { segmentPlaying } = audio;
        if (segmentPlaying) {
          dbgv && console.log(msg, '[2]wait', 
            segmentPlaying && "segmentPlaying",
            tutorPlay && "tutorPlay");
          return false;
        }

        if (wikiCard?.isOpen) {
          dbgv && console.log(msg, '[3]wikiCard');
          return false;
        }

        // Tutorial popups interfere with links, so don't
        // allow other open cards
        let nonWikiOpen = openCards.filter(c=>c !== wikiCard).length;
        if (nonWikiOpen) {
          dbgv && console.log(msg, '[4]wait', {nonWikiOpen});
          return false;
        }

        dbgv && console.log(msg, '[5]show');
        return true;
      },
      showTutorPlay(ctx) {
        const msg = "App.showTutorPlay()";
        const dbg = DBG.TUTORIAL;
        const dbgv = dbg && DBG.VERBOSE;
        let { audio, settings, } = this;
        let { tutorPlay, tutorWiki } = settings;
        let { audioScid } = audio;
        if (!tutorPlay) {
          dbgv && console.log(msg, '[1]done', {tutorPlay});
          return false;
        }
        if (!audioScid) {
          dbgv && console.log(msg, '[2]wait', {audioScid});
          return false;
        }
        dbgv && console.log(msg, '[3]show');
        return true;
      },
      showTutorSearch(ctx) {
        const msg = "App.showTutorSearch()";
        const dbg = DBG.TUTORIAL;
        const dbgv = dbg && DBG.VERBOSE;
        let { audio, settings, } = this;
        let { 
          tutorAsk, tutorSearch, tutorClose, tutorWiki, cards 
        } = settings;

        if (tutorAsk) {
          dbgv && console.log(msg, '[0]tutorAsk');
          return false;
        }
        if (!tutorSearch) {
          dbgv && console.log(msg, '[1]done', {tutorSearch});
          return false;
        }

        if (tutorClose || tutorWiki) {
          dbgv && console.log(msg, '[2]wait', {tutorClose, tutorWiki});
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
          dbgv && console.log(msg, '[3]wait', {nOpen, audioScid});
          return false;
        }

        dbgv && console.log(msg, '[4]show');
        return true;
      },
      showTutorClose(ctx) {
        const msg = "App.showTutorClose()";
        const dbg = DBG.TUTORIAL;
        const dbgv = dbg && DBG.VERBOSE;
        let { settings, } = this;
        let { tutorClose, tutorWiki, cards } = settings;
        let wikiCard = cards.reduce((a,card)=>{
          return card.context === EbtCard.CONTEXT_WIKI ? card : a;
        }, null);
        if (!tutorClose) {
          dbgv && console.log(msg, '[1]done', {tutorClose});
          return false;
        }
        if (!wikiCard || !wikiCard.isOpen) {
          dbgv && console.log(msg, '[2]wait:wiki card hidden');
          return false;
        }

        dbgv && console.log(msg, '[3]show');
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
    linear-gradient(160deg, 
      rgb(var(--v-theme-currentbg)), 
      rgb(var(--v-theme-toolbar))
      ) !important;
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
.ebt-title-start {
  opacity: 0;
}
.ebt-title-end {
  opacity: 1;
  transition: opacity 5s ease-in-out;
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
.app-log-item {
  text-indent: -3em;
  padding-left: 3em;
  margin-bottom: 0.2em;
  line-height: 1.2em;
}
.app-log-item:hover{
  color: rgb(255,255,80);
  background-color: black;
}
.app-log-count {
  display: inline-block;
  width: 1.5em;
  border-right: 1pt solid rgba(255,255,80, 0.2);
}
.app-log-item:hover .app-log-count {
  border-right: 1pt solid rgba(255,255,80, 1);
}
.app-extension {
  width: 100%;
}
.app-dbg-container{
  display: flex;
  flex-flow: row wrap;
  max-width: 500px;
  font-size: 12px;
}
.app-dbg {
  display: inline-block;
  max-width: 105px;
  text-overflow: clip;
  overflow: hidden;
  margin-left: 0.5em;
}
.app-dbg:hover {
  color: rgb(var(--v-theme-debug));
  border: 1pt solid rgb(var(--v-theme-debug));
}
.transient-msg {
  margin-bottom: calc(50vh - 25px);
  max-width: calc(min(100vw, 400px)) !important;
  min-width: calc(min(100vw, 310px)) !important;
}
.transient-msg .v-snackbar__content {
  text-align: center;
}
.sc-voice {
  position: absolute;
  text-align: center;
  line-height: 1em;
  width: 300px;
  left: calc(50vw - 150px);
}
.sc-voice-start {
  color: rgb(var(--v-theme-progress1));
  letter-spacing: 0.1em;
  font-size: 12pt;
  top: 20px;
  opacity: 1;
}
.sc-voice-end {
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: 0.4em;
  font-size: 8pt;
  opacity: 0;
  top: 1px;
  transition: 
    top 5s,
    letter-spacing 5s,
    font-size 5s ease-in-out,
    color 5s ease-in-out,
    opacity 5s ease-in-out;
}
.app-name {
}
.app-name-start {
  opacity: 0.2;
}
.app-name-end {
  opacity: 1;
  transition:
    opacity 5s ease-in-out;
}
.app-btns {
}
.app-btns-start {
  opacity: 0;
}
.app-btns-end {
  opacity: 1;
  transition: opacity 5s ease-in-out;
}
</style>

