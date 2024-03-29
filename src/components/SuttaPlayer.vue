<template>
  <v-bottom-navigation v-if="audio.audioScid" 
    hide-on-scroll
    dense
    dark
    bg-color="audiobar"
    class="audio-nav"
  >
    <div class="play-col">
      <v-progress-linear 
        :model-value="segmentPercent"
        :buffer-value="100"
        color="progress1" 
        bg-color="progress2"
        height="2px" />
      <div class="play-row">
        <v-btn icon @click="audio.back()" density="compact" tabindex=-1>
          <v-icon size="small" icon="mdi-skip-previous" />
        </v-btn>
        <v-btn id="audio-play-pause" icon density="compact"
          tabindex=-1
          @keydown="audio.keydown"
          @click="clickPlayOne" 
          @blur="onAudioBlur"
          @focus="onAudioFocus('audio-play-pause')"
          :disabled="audio.playing && audio.playMode!=='one'"
        >
          <v-icon size="small" 
            :icon="audio.idbAudio?.isPlaying ? 'mdi-pause' : 'mdi-play-pause'" />
        </v-btn>
        <div class="play-scid" >
          <div @click="onShowScid">
            {{audio.audioScid}}
          </div>
          <div v-if="playOne" class="audioElapsed">
            {{ audioElapsed }} / {{ audioDuration }}
          </div>
          <div v-if="playEnd" class="audioElapsed">
            {{ playedMinutes }} / {{ maxPlayMinutes }}
          </div>
        </div>
        <v-btn id="audio-play-to-end"
          icon density="compact"
          tabindex=-1
          @click="clickPlayToEnd" 
          @keydown="audio.keydown"
          @blur="onAudioBlur"
          @focus="onAudioFocus('audio-play-to-end')"
          :disabled="audio.playing && audio.playMode!=='end'"
        >
          <v-icon size="small" 
            :icon="audio.idbAudio?.isPlaying ? 'mdi-pause' : 'mdi-play'" />
        </v-btn>
        <v-btn icon @click="audio.next()" density="compact" tabindex=-1>
          <v-icon size="small" icon="mdi-skip-next" />
        </v-btn>
      </div><!-- play-row -->
    </div><!-- play-col -->
  </v-bottom-navigation>
</template>

<script>
  import { ref, nextTick } from "vue";
  import { Examples, SuttaRef } from 'scv-esm';
  import { default as IdbSutta } from '../idb-sutta.mjs';
  import { default as EbtSettings } from "../ebt-settings.mjs";
  import { default as EbtCard } from '../ebt-card.mjs';
  import { default as IdbAudio } from '../idb-audio.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { logger } from "log-instance/index.mjs";
  const EXAMPLE_TEMPLATE = IdbSutta.EXAMPLE_TEMPLATE;

  export default {
    props: {
      routeCard: { type: Object, },
    },
    setup() {
      return {
        audio: useAudioStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
      }
    },
    methods: {
      clickPlayOne() {
        let { audio } = this;
        audio.clickPlayOne();
      },
      clickPlayToEnd() {
        let { audio } = this;
        audio.clickPlayToEnd();
      },
      onAudioBlur() {
        let { audio } = this;
        //audio.audioFocused = false;
      },
      onAudioFocus(audioFocus) {
        let { audio, } = this;
        //audio.audioFocused = true;
      },
      onShowScid() {
        let { routeCard, settings, } = this;
        let segmentElementId = routeCard.segmentElementId();
        settings.scrollToElementId(segmentElementId);
      },
      audioPlaying() {
        let { audio } = this;
        let { idbAudio, mainContext } = audio;
        return !!idbAudio?.audioSource && 
          audio?.mainContext?.state === 'running';
      },
      isRunning() {
        return this.audio.mainContext?.state === 'running';
      },
    },
    computed: {
      playOne(ctx) {
        let { 
          audioElapsed, playMode, PLAY_ONE, audioDuration 
        } = ctx.audio;
        return audioElapsed>0 && playMode===PLAY_ONE && audioDuration;
      },
      playEnd(ctx) {
        let { playMode, PLAY_END, } = ctx.audio;
        return playMode === PLAY_END;
      },
      playedMinutes(ctx) {
        let { playedSeconds } = ctx.audio;
        let seconds = Math.round(playedSeconds);
        let min = Math.floor(seconds / 60);
        let sec = seconds % 60;
        return sec < 10
          ? `${min}:0${sec}`
          : `${min}:${sec}`;
      },
      maxPlayMinutes(ctx) {
        let { maxPlayMinutes } = ctx.settings;
        return `${maxPlayMinutes}:00`;
      },
      audioElapsed(ctx) {
        let elapsed = ctx.audio.audioElapsed;
        return elapsed.toFixed(1);
      },
      audioDuration(ctx) {
        let duration = ctx.audio.audioDuration();
        return typeof duration === 'number' ? duration.toFixed(1) : null
      },
      audioSutta(ctx) {
        return ctx.audio.audioSutta;
      },
      segmentPercent(ctx) {
        let { audio, audioSutta } = ctx;
        let { audioIndex } = audio;
        return (audioIndex+1)*100 / audioSutta.segments.length+1;
      },
    },
  }
</script>
<style scoped>
  .play-col {
    display: flex;
    flex-flow: column nowrap;
  }
  .play-row {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: center;
    opacity: 1;
  }
  .play-row button {
    padding: 0;
    min-width: 48px;
    max-width: 54px;
  }
  .play-scid {
    cursor: pointer;
    display: flex;
    flex-flow: column;
    align-items: center;
    font-family: var(--ebt-sc-sans-font);
    font-size: larger;
    font-weight: 600;
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }
  .audioElapsed {
    font-weight: 400;
  }
  .audio-nav {
    padding-top: 2px;
    opacity: 1;
  }
</style>
