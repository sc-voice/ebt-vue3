<template>
  <v-dialog v-model="showDialog"
    @update:modelValue="onClose"
  >
  <v-card width="30em" class="card">
    <v-card-actions class="">
      <div class="ml-4">There's a new SuttaCentral Voice!</div>
      <v-spacer />
      <v-btn icon="mdi-close" @click="onCancel()"/>
    </v-card-actions>
    <v-card-text>
      <div class="form">
        <v-radio-group v-model="ignoreLegacyVoice" 
        >
          <v-radio class="caution" :value="false"
            label="Use original SuttaCentral Voice today"
          />
          <v-radio class="recommend" :value="true"
            label="Try new SuttaCentral Voice!"
          />
        </v-radio-group>

        <div class="details">
          <div v-if="ignoreLegacyVoice===false">
            <div class="text-title">Caution:</div>
            <ul style="padding-left:2em">
              <li>No new content</li>
              <li>Software is no longer supported</li>
              <li>Scheduled shutdown in 2024</li>
            </ul>
          </div>
          <div v-if="ignoreLegacyVoice!==false">
            <div class="text-title">New features:</div>
            <ul style="padding-left:2em">
              <li>Latest sutta/vinaya content</li>
              <li>Click any segment and play it</li>
              <li>Open multiple suttas at the same time</li>
              <li>Dark/Light themes</li>
              <li>Trilingual suttas</li>
              <li>...</li>
            </ul>
          </div>
        </div><!--details-->
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn icon="mdi-check-bold" 
        :disabled="ignoreLegacyVoice===undefined"
        @click="onSave()"
      ></v-btn>
    </v-card-actions>
  </v-card>
  </v-dialog>
</template>
<script setup>
  import { computed, ref } from "vue";
  import { useSettingsStore } from "../stores/settings.mjs";

  // WARNING: Settings is not loaded yet in setup!
  const settings = useSettingsStore();

  const ignoreLegacyVoice = ref();
  const showDialog = ref(false);

  settings.loadSettings().then(()=>{
    ignoreLegacyVoice.value = settings.ignoreLegacyVoice;
    showDialog.value = settings.ignoreLegacyVoice !== true;
  });

  function onClose() {
  }

  function onCancel() {
    showDialog.value = false;
  }

  function onSave() {
    showDialog.value = false;
    settings.ignoreLegacyVoice = ignoreLegacyVoice.value;
  }
</script>
<style scoped>
.form {
  display: flex;
  flex-flow: column;
  justify-content: start;
}
.caution {
  color: orange;
}
.recommend {
  color: lime;
}
.details {
  margin-top: 1em;
  min-height: 10.5em;
}

</style>
