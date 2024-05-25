<template>
  <v-sheet v-if="playlist">
    <v-pagination 
      v-model="playlist.page"
      density="comfortable"
      :length="playlist.suttaRefs.length"
      :total-visible="5"
      :aria-label="playlist.cursor.sutta_uid"
      :current-page-aria-label="playlist.cursor.sutta_uid"
      @click.stop.prevent="onClickPlaylist"
    ></v-pagination>
    <sutta-core :card="card" :routeCard="routeCard"
    ></sutta-core>
    <v-pagination 
      v-model="playlist.page"
      density="comfortable"
      :length="playlist.suttaRefs.length"
      :total-visible="5"
      :aria-label="playlist.cursor.sutta_uid"
      @click.stop.prevent="onClickPlaylist"
    ></v-pagination>
  </v-sheet>
</template>

<script>
  import { Tipitaka, SuttaRef, } from "scv-esm";
  import { ref } from "vue";
  import { default as SuttaCore } from './SuttaCore.vue';
  import { default as TipitakaNav } from './TipitakaNav.vue';
  import { default as Playlist } from '../playlist.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { 
    DBG, DBG_VERBOSE, 
  } from '../defines.mjs';

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
        playlist: ref(),
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
      this.playlist = playlist;
      dbg && console.log(msg, playlist);
    },
    methods: {
      onClickPlaylist(evt) {
        const msg = "PlayView.onClickPlaylist()";
        const dbg = DBG.PLAYLIST;
        let { playlist, audio, card } = this;
        let { suttaRefs, cursor } = playlist;
        let { location } = card;
        let srSave = SuttaRef.create(location.slice(0,3).join('/'));
        let sr = suttaRefs.find(sr=>sr.sutta_uid===srSave.sutta_uid);
        Object.assign(sr, srSave);

        dbg && console.log(msg, '[1]playlist', playlist);

        audio.syncPlaylistSutta(playlist);
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

