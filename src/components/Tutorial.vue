<template>
  <v-snackbar 
    v-if="settings.loaded"
    v-model="showTutorial"
    :absolute="!!props.containerId"
    :attach="containerElt()"
    timeout="-1"
    color="tutorial"
    :content-class="contentClass"
    :location="location"
    :transition="transition()"
    min-width="200px"
    max-width="250px"
    min-height="100px"
    max-height="100px"
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
      <div class="tutorial-close">
        <v-icon  icon="mdi-close" 
          :title="$t('ebt.closeCard')"
          @click="onClick" 
        ></v-icon>
      </div>
    </div><!--tutorial-container-->
  </v-snackbar> 
</template>
<script setup>
  import { computed, ref, onMounted, } from "vue";
  import { useAudioStore } from "../stores/audio.mjs";
  import { useSettingsStore } from "../stores/settings.mjs";
  import { useVolatileStore } from "../stores/volatile.mjs";
  import { default as EbtCard } from "../ebt-card.mjs";
  import { DBG_TUTORIAL, DBG_STARTUP } from "../defines.mjs";

  const audio = useAudioStore();
  const settings = useSettingsStore();
  const volatile = useVolatileStore();
  const isDelayed = ref(true);
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
    let dbg = DBG_STARTUP && DBG_TUTORIAL;
    let { setting, msDelay, hflip } = props;

    if (msDelay) {
      setTimeout(()=>{
        isDelayed.value = false;
        dbg && console.log(msg, `[1]ok ${setting}`, {msDelay});
      }, msDelay);
    } else {
      dbg && console.log(msg, `[2]ok ${setting}`, {hflip});
      isDelayed.value = false;
    }
  });
  const showTutorial = computed(()=>{
    const msg = "Tutorial.showTutorial()";
    let dbg = DBG_TUTORIAL;
    let { setting, } = props;

    if (isDelayed.value) {
      return false;
    }
    if (!settings[setting]) {
      return false;
    }

    return true;
  });
  function tutorialsAllowed() {
    let dbg = DBG_TUTORIAL;
    if (!settings.loaded) {
      dbg && console.log(msg, "false");
      return false;
    }
    dbg && console.log(msg, "true");
    return true;
  }
  const contentClass = computed(()=>{
    let { setting } = props;
    return `tutorial-content tutorial-content-${setting}`;
  });
  const location = computed(()=>{
    const msg = 'Tutorial.location';
    let { bottom, top, setting, arrow } = props;
    let dbg = DBG_TUTORIAL;
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
.tutorial-content>.v-snackbar__content {
  padding-left: 8px;
  padding-right: 8px;
}
.tutorial-content-tutorSearch {
  top: 45px !important;
  right: 45px !important;
}
.tutorial-content-tutorSettings {
  top: 45px !important;
  right: 1px !important;
}
.tutorial-content-tutorPlay {
  bottom: 40px !important;
  right: calc(50vw - 113px)  !important;
}
.tutorial-content-tutorClose {
  top: 50px !important;
  right: 5px !important;
}
.tutorial-content-tutorWiki {
  left: -5px !important;
  top: 80px !important;
}
.tutorial-arrow {
  color: yellow;
}
.tutorial-close {
  display: flex;
  flex-flow: column;
  justify-content: space-around;
  margin-left: 5px;
  margin-right: 5px;
  color: rgb(var(--v-theme-on-surface)) !important;
}
.tutorial-close:hover {
  color: rgb(var(--v-theme-link)) !important;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-2px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
