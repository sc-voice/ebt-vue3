<template>
  <v-snackbar 
    v-if="settings.loaded"
    v-model="showTutorial"
    :absolute="!!props.containerId"
    :attach="containerElt()"
    color="tutorial"
    timeout="-1"
    :content-class="contentClass"
    :location="location"
    :transition="transition()"
    min-width="200px"
    max-width="200px"
    min-height="100px"
    max-height="100px"
    @click="onClick"
    :id="`${props.setting}-id`"
  >
    <div class="tutorial-container"
      :style="hflip ? 'flex-flow:row' : 'flex-flow:row-reverse'"
    >
      <div :class="`tutorial-pointer-${arrow}`" >
        <v-icon v-if="arrow === 'top'"
          :class="`tutorial-arrow`" size=30 
          icon="mdi-arrow-up"
        ></v-icon>
        <v-icon size=35 class="tutorial-icon"
          icon="mdi-cursor-default-click"
        ></v-icon>
        <v-icon v-if="arrow === 'bottom'"
          :class="`tutorial-arrow`" size=30 
          icon="mdi-arrow-down"
        ></v-icon>
      </div><!-- tutorial-pointer-arrow -->
      <div class="tutorial">
        <div>
          <div class="text-caption font-italic">
            {{$t('ebt.tutorial')}}
          </div>
          <div class="text-h6 mt-1">{{title}}</div>
          <div>{{text}}</div>
        </div>
      </div><!--tutorial-->
    </div><!--tutorial-container-->
  </v-snackbar> 
</template>
<script setup>
  import { computed, ref, onMounted, } from "vue";
  import { useAudioStore } from "../stores/audio.mjs";
  import { useSettingsStore } from "../stores/settings.mjs";
  import { useVolatileStore } from "../stores/volatile.mjs";
  import { default as EbtCard } from "../ebt-card.mjs";
  import { DEBUG_TUTORIAL, DEBUG_STARTUP } from "../defines.mjs";

  const audio = useAudioStore();
  const settings = useSettingsStore();
  const volatile = useVolatileStore();
  const isShown = ref(false);
  const props = defineProps({
    arrow: String,
    icon: String,
    setting: String,
    containerId: String,
    text: String,
    title: String,
    top: Boolean,
    hflip: Boolean,
    bottom: Boolean,
    msDelay: Number,
  });
  onMounted(()=>{
    const msg = "Tutorial.mounted()";
    let dbg = DEBUG_STARTUP && DEBUG_TUTORIAL;
    let { setting, msDelay, hflip } = props;

    if (msDelay) {
      setTimeout(()=>{
        isShown.value = true;
        dbg && console.log(msg, `[1]${setting}`, {msDelay});
      }, msDelay);
    } else {
      dbg && console.log(msg, `[2]${setting}`, {hflip});
      isShown.value = true;
    }
  });
  const showTutorial = computed(()=>{
    const msg = "Tutorial.showTutorial)";
    let dbg = DEBUG_TUTORIAL;
    let { setting, containerId } = props;
    let { 
      tutorClose, tutorPlay, tutorSearch, tutorSettings, tutorWiki,
      loaded, cards=[] 
    } = settings;
    let { showSettings } = volatile;
    let show = isShown.value && !showSettings && settings[setting];
    if (!show) {
      return !!show;
    }

    let wikiCard = cards.reduce((a,card)=>{
      return card.context === EbtCard.CONTEXT_WIKI ? card : a;
    }, null);
    let hasSearch = cards.reduce((a,card)=>{
      return card.context === EbtCard.CONTEXT_SEARCH ? true : a;
    }, false);
    let hasSutta = cards.reduce((a,card)=>{
      return card.context === EbtCard.CONTEXT_SUTTA ? true : a;
    }, false);
    switch (setting) {
      case 'tutorClose': {
        show = show && wikiCard.isOpen;
        let elt = document.getElementById(containerId);
        let rect = elt && elt.getBoundingClientRect();
        dbg && console.log(msg, `[1]${setting}`, {show, elt, rect});
        break;
      }
      case 'tutorWiki':
        show = show && !tutorClose && !wikiCard.isOpen;
        dbg && console.log(msg, `[1]${setting}`, {show});
        break;
      case 'tutorSearch':
        show = show && !tutorWiki && !hasSearch;
        dbg && console.log(msg, `[1]${setting}`, {show, tutorWiki});
        break;
      case 'tutorSettings':
        show = show && !tutorSearch && !tutorPlay;
        break;
      case 'tutorPlay':
        show = show && audio.audioScid;
        break;
      default:
        break;
    }

    return show;
  });
  const contentClass = computed(()=>{
    let { setting } = props;
    return `tutorial-content-${setting}`;
  });
  const location = computed(()=>{
    const msg = 'Tutorial.location';
    let { bottom, top, setting, arrow } = props;
    let dbg = DEBUG_TUTORIAL;
    let vertical = top && "top" || bottom && "bottom" || arrow;
    let loc = `${vertical} right`;
    //dbg && console.log(msg, {top, arrow, loc});
    return loc;
  });

  function transition() {
    return {
      name: 'fab-transition',
      duration: "10000",
    }
  }

  function onClick() {
    const msg = "Tutorial.onClick()";
    let { setting } = props;
    console.log(msg);
    settings[setting] = false;
  }

  function containerElt() {
    let { setting, containerId="body" } = props;
    let elt = document.getElementById(containerId);
    return elt || "body";
  }
</script>
<style >
.tutorial-container {
  display: flex;
  flex-flow: row-reverse nowrap;
  justify-content: space-between;
}
.tutorial-pointer-top {
  animation: shake 2.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  display: flex;
  flex-flow: column;
  height: 100px;
  justify-content: flex-start;
  align-items: center;
}
.tutorial-pointer-bottom {
  animation: shake 2.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  display: flex;
  flex-flow: column;
  height: 100px;
  justify-content: flex-end;
}
.tutorial {
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  align-items: start;
  color: yellow;
  bottom: 50px;
  left: calc(50vw);
}
.tutorial-icon {
  margin-top: 7px;
  margin-bottom: 7px;
  opacity: 0.5;
}
.tutorial-content-tutorSearch {
  top: 45px !important;
  right: 45px !important;
}
.tutorial-content-tutorSettings {
  top: 45px !important;
  right: 0px !important;
}
.tutorial-content-tutorPlay {
  bottom: 40px !important;
  right: calc(50vw - 110px)  !important;
}
.tutorial-content-tutorClose {
  top: 50px !important;
}
.tutorial-content-tutorWiki {
  left: 5px !important;
  top: 80px !important;
}
.tutorial-arrow {
  color: yellow;
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-2px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
