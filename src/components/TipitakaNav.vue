<template>
  <div class="tipitaka-nav">
    <div>
      <a :href="`#/sutta/${prevSuid}`" v-if="prevSuid" tabindex=-1>
        <v-icon icon="mdi-menu-left" />{{prevSuid}}
      </a>
    </div>
    <div>
      <v-select 
        v-if="DBG?.PLAYLIST"
        density="compact"
        hide-details
        :items="playlist"
        v-model="card.location[0]"
        @click.prevent.stop="onPlaylist"
      ></v-select>
      <!--a :href="hrefSuttaCentral(sutta_uid)" target="_blank" tabindex=-1>
        {{scLabel}}
      </a-->
    </div>
    <div>
      <a :href="`#/sutta/${nextSuid}`" v-if="nextSuid" tabindex=-1>
        {{nextSuid}}<v-icon icon="mdi-menu-right" />
      </a>
    </div>
  </div><!-- tipitaka-nav -->
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useSuttasStore } from '../stores/suttas.mjs';
  import { logger } from "log-instance/index.mjs";
  import { Examples, Tipitaka, SuttaRef } from "scv-esm";
  import { nextTick, ref } from "vue";
  import { default as IdbSutta } from '../idb-sutta.mjs';
  import * as Idb from "idb-keyval";
  import { default as SegmentView } from './SegmentView.vue';
  import { default as SegmentHeader } from './SegmentHeader.vue';
  import { DBG } from '../defines.mjs';
  const EXAMPLE_TEMPLATE = IdbSutta.EXAMPLE_TEMPLATE;
  const playlist = ref(['thig1.10', 'an1.11-20', 'mn121']);

  var hello = 0;

  export default {
    props: {
      card: { type: Object, required: true, },
    },
    setup() {
      const settings = useSettingsStore();
      const volatile = useVolatileStore();
      const suttas = useSuttasStore();
      const idbSuttaRef = ref(null);
      const showTakaNav = ref(false);
      return {
        settings,
        volatile,
        suttas,
        playlist,
        idbSuttaRef,
        taka: new Tipitaka(),
        showTakaNav,
        DBG,
      }
    },
    components: {
      SegmentView,
      SegmentHeader,
    },
    methods: {
      hrefSuttaCentral(sutta_uid) {
        return `https://suttacentral.net/${sutta_uid}`;
      },
      onPlaylist(evt) {
        const msg = "TipitakaNav.onPlaylist()";
        const dbg = DBG.PLAYLIST;
        dbg && console.log(msg, evt);
      }
    },
    computed: {
      playListItems(ctx) {
        let { card } = ctx;
        let dummy = ['thig1.1', 'an1.1-10', 'mn8'];
        if (dummy.find(elt=>elt===card.location[0])) {
          dummy.push(card.location[0]);
        }
        return dummy;
      },
      isNarrow(ctx) {
        let root = document.documentElement;
        const viewRight = (window.innerWidth || root.clientWidth);
        return viewRight < 600;
      },
      scLabel(ctx) {
        let { sutta_uid, isNarrow } = ctx;
        return isNarrow
          ? `suttacentral`
          : `suttacentral/${sutta_uid}`;
      },
      nextSuid(ctx) {
        let { sutta_uid, taka } = ctx;
        return taka.nextSuid(sutta_uid);
      },
      prevSuid(ctx) { 
        let { sutta_uid, taka } = ctx;
        return taka.previousSuid(sutta_uid);
      },
      sutta_uid(ctx) {
        let { card } = ctx;
        let suttaRef = SuttaRef.create(card.location[0]);
        if (suttaRef == null) {
          return 'sutta_uid?';
        }
        return suttaRef.sutta_uid;
      },
      takaNavIcon(ctx) {
        let { showTakaNav } = ctx;
        return showTakaNav 
          ? 'mdi-arrow-collapse-horizontal' 
          : 'mdi-arrow-expand-horizontal'
      },
    },
  }
</script>

<style >
.tipitaka-nav {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  opacity: 0.4;
  margin-bottom: 0.5rem;
}
.tipitaka-nav:focus-within,
.tipitaka-nav:hover {
  opacity: 1;
}
</style>

