<template>
  <v-sheet>
    <tipitaka-nav :card="card"/>
    <sutta-core :card="card" :routeCard="routeCard"
    ></sutta-core>
    <tipitaka-nav :card="card" class="mt-3"/>
  </v-sheet>
</template>

<script>
  import { Tipitaka, } from "scv-esm";
  import { ref } from "vue";
  import { default as SuttaCore } from './SuttaCore.vue';
  import { default as TipitakaNav } from './TipitakaNav.vue';
  import { 
    DBG, DBG_MOUNTED, DBG_VERBOSE, 
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
      }
    },
    components: {
      SuttaCore,
      TipitakaNav,
    },
    mounted() {
      const msg = 'PlayView.mounted() ';
      const dbg = DBG_MOUNTED;
      dbg && console.log(msg);
    },
    methods: {
    },
    computed: {
    },
  }
</script>

<style >
</style>

