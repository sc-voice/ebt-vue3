<template>
  <v-dialog v-if="volatile.showWaiting"  
    v-model="processing" 
    class="ebt-processing-overlay"
  >
    <v-card loading class="ebt-processing" >
      <v-card-title>
        {{volatile.waitingMsg}}
        <v-spacer/>
        {{volatile.waitingContext}}
      </v-card-title>
      <v-card-text>
        <div class="ebt-processing-status">
          <v-icon size="x-large" :icon="volatile.waitingIcon" />
          <v-progress-circular 
            indeterminate 
            width=3
            size=30
            color="progress1" 
            bg-color="progress2"
            class=""
          >
            {{volatile.waiting}}
          </v-progress-circular>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';

export default {
  components: {
  },
  data () {
    return {
      volatile: useVolatileStore(),
    }
  },
  methods: {
  },
  computed: {
    processing(ctx) {
      let { volatile } = this;
      return volatile.waiting > 0;
    },
  },
}
</script>
<style>
.ebt-processing {
  border: 2px solid rgb(var(--v-theme-progress1));
  margin-left: auto;
  margin-right: auto;
  padding-bottom: 5px;
}
.ebt-processing-overlay {
  height: 100%;
  width: 100%;
  background: rgb(0,0,0,0.1);
  backdrop-filter: blur(1px);
}
.ebt-processing-status {
  width: 15em;
  display: flex;
  justify-content: space-around;
}
</style>
