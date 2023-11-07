<template>
  <v-dialog v-model="showDialog"
    transition="dialog-top-transition"
    @update:modelValue="onClose"
    @keyup.enter="(legacyVoice !== 'ask') && onSave()"
  >
  <v-card width="30em" class="card">
    <v-card-actions class="">
      <div class="ml-4">There's a new SuttaCentral Voice!</div>
      <v-spacer />
      <!--v-btn icon="mdi-close" @click="onCancel()"/-->
    </v-card-actions>
    <v-card-text>
      <div class="form">
        <v-radio-group v-model="legacyVoice" >
          <v-radio class="recommend" value="new"
            label="Try new Voice!"
          />
          <div :class="legacyVoice!=='old' ? '' : 'dim'">
            <ul style="padding-left:4em">
              <li>Latest sutta/vinaya content</li>
              <li>Click any segment and play it</li>
              <li>Open multiple suttas at the same time</li>
              <li>...</li>
            </ul>
          </div>
          <v-radio class="caution" value="old"
            label="Use original Voice today"
          />
          <div :class="legacyVoice!=='old' ? 'dim' : ''">
            <ul style="padding-left:4em">
              <li class="warning">Scheduled shutdown in 2024</li>
              <li>No new content</li>
            </ul>
          </div>
        </v-radio-group>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-btn icon="mdi-close" @click="onCancel()"/>
      <v-spacer />
      <div v-if="legacyVoice==='new'">
        <v-btn icon="mdi-check-bold" 
          :disabled="legacyVoice==='ask'"
          @click="onSave()"
          class="recommend"
        ></v-btn>
      </div>
      <div v-if="legacyVoice!=='new'">
        <v-btn icon="mdi-check-bold" 
          :disabled="legacyVoice==='ask'"
          @click="onSave()"
        ></v-btn>
      </div>
    </v-card-actions>
  </v-card>
  </v-dialog>
</template>
<script setup>
  import { computed, ref } from "vue";
  import { useSettingsStore } from "../stores/settings.mjs";

  // WARNING: Settings is not loaded yet in setup!
  const settings = useSettingsStore();

  const legacyVoice = ref();
  const showDialog = ref(false);
  const voiceUrl = computed(()=>{
    const VOICE = "https://voice.suttacentral.net/scv/#/";
    const hash = location.hash.replace("#/sutta/",'');
    let [search,lang] = hash.split('/');
    search = search.split(':')[0];
    return `${VOICE}?search=${search}&lang=${lang}`;
  });

  settings.loadSettings().then(()=>{
    const msg = 'LegacyVoice.loadSettings()';
    legacyVoice.value = settings.legacyVoice;
    let { search='' } = location;
    let isSrcSC = search.search('src=sc') >= 0;
    console.log(msg, location, isSrcSC);
    showDialog.value = isSrcSC && settings.legacyVoice !== 'new';
  });

  function onClose() {
    const msg = 'LegacyVoice.onClose()';
    console.log(msg);
  }

  function onCancel() {
    showDialog.value = false;
  }

  function onSave() {
    const msg = 'LegacyVoice.onSave()';
    showDialog.value = false;
    settings.legacyVoice = legacyVoice.value;
    switch (settings.legacyVoice) {
      case 'new':
        location.search = '';
        break;
      case 'old': {
        location = voiceUrl.value;
        break;
      }
    }
  }

  function dimClass(value) {
    return legacyVoice.value === value
      ? ''
      : 'dim'
  }
</script>
<style scoped>
.form {
  display: flex;
  flex-flow: column;
  justify-content: start;
}
.caution {
  color: white;
  font-weight: 700;
}
.dim {
  color: grey;
}
.warning {
  font-weight: 700;
}
.recommend {
  color: lime;
  font-weight: 700;
}
.details {
  margin-top: 0.5em;
  padding-top: 0.5em;
  margin-left: 1em;
  min-height: 10.5em;
}
.voice-url {
  margin-top: 1em;
  font-size: small;
  color: grey;
}

</style>
