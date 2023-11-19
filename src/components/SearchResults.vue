<template>
  <v-list>
    <v-list-item v-for="(result,i) in matchedSuttas" 
      :key="result"
    >
      <div class="result">
        <div class="result-title-main">
          <div class="result-title-number">{{i+1}}</div>
          <a :href="`#/sutta/${href(card.data[i])}`" class="scv-matched">
            <div class="result-title-body" 
              :title="resultAria(result, i)"
              v-html="resultTitle(result, i) + resultAria(result,i)"
            ></div>
          </a>
        </div> <!-- result-title-main -->
        <div class="result-blurb" 
          @click="clickResult(result,i)">
          {{result.blurb || result.suttaplex?.blurb}}
        </div>
        <div v-for="seg in matchedSegment(result)"
          class="result-segment"
        >
          <a :href="`#/sutta/${href(card.data[i], seg.scid)}`">
            <span class="result-scid">{{seg.scid}}</span>
            <span v-html="seg[settings.langTrans]" />
          </a>
        </div><!-- result-segment -->
      </div><!--result-->
    </v-list-item>
  </v-list>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { SuttaRef, Tipitaka } from 'scv-esm';
  import { nextTick, ref } from "vue";

  const tipitaka = new Tipitaka();

  export default {
    props: {
      card: {
        type: Object,
        required: true,
      },
      results: {
        type: Object,
      },
    },
    setup() {
      return {
        audio: useAudioStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
      }
    },
    data: () => {
      return {
        panels: [],
      }
    },
    components: {
    },
    async mounted() {
    },
    methods: {
      clickResult(result, i) {
        const msg = 'SearchResults.clickResult()';
        let { volatile, card } = this;
        let { origin, pathname } = window.location;
        let hash = `#/sutta/${this.href(card.data[i])}`;
        let url = `${origin}${pathname}${hash}`;
        nextTick(()=>{
          try {
            volatile.setRoute(hash);
            window.location.reload();
            console.log(msg, {hash, url}, window.location);
          } catch(e){
            console.log(msg, {url,e});
          }
        });
      },
      matchedSegment(result) {
        let segments = result?.segments || [];
        return segments.filter(seg=>seg.matched).slice(0,1);
      },
      durationDisplay(totalSeconds) {
        let { $t } = this;
        totalSeconds = Math.round(totalSeconds);
        var seconds = totalSeconds;
        var hours = Math.trunc(seconds / 3600);
        seconds -= hours * 3600;
        var minutes = Math.trunc(seconds / 60);
        seconds -= minutes * 60;
        if (hours) {
            var tDisplay = $t('ebt.HHMM');
            var tAria = $t('ebt.ariaHHMM');
        } else if (minutes) {
            var tDisplay = $t('ebt.MMSS');
            var tAria = $t('ebt.ariaMMSS');
        } else {
            var tDisplay = $t('ebt.seconds');
            var tAria = $t('ebt.ariaSeconds');
        }
        var display = tDisplay
            .replace(/A_HOURS/, hours)
            .replace(/A_MINUTES/, minutes)
            .replace(/A_SECONDS/, seconds);
        var aria = tAria
            .replace(/A_HOURS/, hours)
            .replace(/A_MINUTES/, minutes)
            .replace(/A_SECONDS/, seconds);

        return {
            totalSeconds,
            hours,
            minutes,
            seconds,
            display,
            aria,
        }
      },
      suttaDuration(sutta) {
        return this.durationDisplay(sutta.stats.seconds).display;
      },
      href(result, segnum) {
        let { uid:sutta_uid, lang, author_uid:author, } = result;
        if (segnum) {
          sutta_uid = segnum;
        }
        let suttaRef = new SuttaRef({sutta_uid, lang, author});
        return `${suttaRef.toString()}`;
      },
      resultAria(result, i) {
        let { card } = this;
        let sutta = card.data[i];
        let duration = this.suttaDuration(result);
        let name = tipitaka.canonicalSuttaId(sutta.uid, 'name');
        return `${name} (${duration})`;
      },
      resultTitle(result, i) {
        let { card } = this;
        let sutta = card.data[i];
        let duration = this.suttaDuration(result);
        let acro = tipitaka.canonicalSuttaId(sutta.uid, 'acro');
        return `${acro} \u2022 ${sutta.title}`;
      },
    },
    computed: {
      matchedSuttas(ctx) {
        return ctx.card.data;
      },
    },
  }
</script>

<style >
</style>
