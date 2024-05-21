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
  import { Tipitaka, } from "scv-esm";
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
      console.log(msg, playlist);
    },
    methods: {
      onClickPlaylist(evt) {
        const msg = "PlayView.onClickPlaylist()";
        let { playlist, audio } = this;
        console.log(msg, `${playlist.cursor}`, playlist);
        audio.syncPlaylist(playlist);
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

