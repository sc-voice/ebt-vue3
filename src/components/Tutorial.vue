<template>
  <v-snackbar 
    v-if="settings.loaded"
    v-model="showTutorial"
    color="tutorial"
    timeout="-1"
    :content-class="contentClass"
    :location="location"
    min-width="200px"
    max-width="200px"
    min-height="100px"
    max-height="100px"
    transition="fab-transition"
    @click="onClick"
  >
    <div class="tutorial">
      <div>
        <div class="text-h6 mt-1">{{title}}</div>
        <div>{{text}}</div>
      </div>
      <v-icon size=35 class="tutorial-icon"
        icon="mdi-cursor-default-click"
      ></v-icon>
    </div>
    <v-icon size=30 :class="`tutorial-arrow-${arrow}`"
      :icon="arrow === 'top' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
    ></v-icon>
  </v-snackbar> 
</template>
<script setup>
  import { computed, ref, } from "vue";
  import { useSettingsStore } from "../stores/settings.mjs";
  import { useVolatileStore } from "../stores/volatile.mjs";
  import { default as EbtCard } from "../ebt-card.mjs";

  const settings = useSettingsStore();
  const volatile = useVolatileStore();
  const props = defineProps({
    title: String,
    text: String,
    icon: String,
    setting: String,
    arrow: String,
  });
  const showTutorial = computed(()=>{
    let { setting, } = props;
    let { loaded, cards=[] } = settings;
    let { showSettings } = volatile;
    let show = !showSettings && settings[setting];
    switch (setting) {
      case 'tutorSearch':
        let nSearch = cards.reduce((a,card)=>{
          return card.context === EbtCard.CONTEXT_SEARCH ? a+1 : a;
        }, 0);
        show = show && nSearch === 0;
        break;
      case 'tutorSettings':
        show = show && !settings.tutorSearch;
        break;
      case 'tutorPlay':
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
    let { setting, arrow } = props;
    return arrow === "top"
      ? "top right"
      : "bottom right"
  });

  function onClick() {
    const msg = "Tutorial.onClick()";
    let { setting } = props;
    console.log(msg);
    settings[setting] = false;
  }
</script>
<style >
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
  margin-top: 14px;
  margin-right: -15px;
  opacity: 0.5;
}
.tutorial-content-tutorSearch {
  top: 45px !important;
  right: 50px !important;
}
.tutorial-content-tutorSettings {
  top: 45px !important;
  right: 0px !important;
}
.tutorial-content-tutorPlay {
  bottom: 40px !important;
  right: calc(50vw - 100px)  !important;
}
.v-snackbar__content .tutorial-arrow-top {
  position: absolute;
  right: 15px;
  top: 0px;
  color: yellow;
  opacity: 1;
}
.v-snackbar__content .tutorial-arrow-bottom {
  position: absolute;
  right: 10px;
  bottom: 0px;
  color: yellow;
  opacity: 1;
}
</style>
