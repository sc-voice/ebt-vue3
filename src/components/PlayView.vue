<template>
  <v-sheet>
    <v-pagination 
      v-model="playlist.page"
      :length="playlist.suttaRefs.length"
      :aria-label="playlist.cursor.sutta_uid"
      :current-page-aria-label="playlist.cursor.sutta_uid"
      @click.stop.prevent="onClickPlaylist"
    ></v-pagination>
    <sutta-core :card="card" :routeCard="routeCard"
    ></sutta-core>
    <v-pagination 
      v-model="playlist.page"
      :length="playlist.suttaRefs.length"
      :aria-label="playlist.cursor.sutta_uid"
      @click.stop.prevent="onClickPlaylist"
    ></v-pagination>
  </v-sheet>
</template>

<script>
  import { Tipitaka, } from "scv-esm";
  import { ref } from "vue";
  import { default as SuttaCore } from './SuttaCore.vue';
  import { default as TipitakaNav } from './TipitakaNav.vue';
  import { default as Playlist } from '../playlist.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { 
    DBG, DBG_VERBOSE, 
  } from '../defines.mjs';

  const DUMMY_SUTTAREFS = [
    "thig1.1/en/soma", 
    "thig1.2/en/soma", 
    "thig1.3/en/soma",
    "thig1.4/en/soma",
    "thig1.5/en/soma",
  ];

  export default {
    inject: ['config'],
    props: {
      card: { type: Object, required: true, },
      routeCard: { type: Object, required: true },
    },
    setup() {
      return {
        taka: new Tipitaka(),
        audio: useAudioStore(),
        playlist: new Playlist({
          suttaRefs: DUMMY_SUTTAREFS,
        }),
      }
    },
    components: {
      SuttaCore,
      TipitakaNav,
    },
    mounted() {
      const msg = 'PlayView.mounted() ';
      const dbg = DBG.MOUNTED;
      let { card } = this;
      let { playlist } = card;
      console.log(msg, playlist);
    },
    methods: {
      onClickPlaylist(evt) {
        const msg = "PlayView.onClickPlaylist()";
        let { playlist, audio } = this;
        console.log(msg, `${playlist.cursor}`);
        audio.syncPlaylist(playlist);
      },
      testNext(value=1) {
        const msg = "PlayView.testNext()";
        let { playlist } = this;
        let res = playlist.advance(value-1);
        console.log(msg, res, playlist.index);
      },
    },
    computed: {
    },
  }
</script>

<style >
.playlist-slider {
  padding-left: 1em;
  padding-right: 1em;
}
.playlist-label {
  color: orange;
  font-weight: 800;
}
</style>

