<template>
  <v-dialog v-if="showLegacyDialog" 
    v-model="showLegacyDialog"
    transition="dialog-top-transition"
    @update:modelValue="onClose"
    @keyup.enter="(legacyVoice !== 'ask') && onSave()"
  >
  <v-card width="30em" class="card">
    <v-card-actions class="">
      <div class="ml-4 text-h6">
        SuttaCentral Voice / {{lang}}
        <span class="recommend">
          &#x27A1;
          {{config.appName}}
        </span>
      </div>
      <v-spacer />
    </v-card-actions>
    <v-card-text>
      <div class="form">
        <v-radio-group id="rg" v-model="legacyVoice" 
          @update:modelValue="onChangedChoice"
        >
          <v-radio id="rnew" class="recommend" value="new"
            :label="$t('ebt.tryNewVoice', {APPNAME:config.appName})"
          />
          <div :class="legacyVoice!=='old' ? '' : 'dim'">
            <ul style="padding-left:4em">
              <li>{{$t('ebt.latestContent')}}</li>
              <li>{{$t('ebt.clickPlaySegment')}}</li>
              <li>{{$t('ebt.viewHearUntranslated')}}</li>
              <li>...</li>
            </ul>
          </div>
          <v-radio id="rold" class="caution" value="old"
            :label="$t('ebt.useOriginalVoice')"
          />
          <div :class="legacyVoice!=='old' ? 'dim' : ''">
            <ul style="padding-left:4em">
              <li class="warning">{{$t('ebt.shutdown2024')}}</li>
              <li>{{$t('ebt.noNewContent')}}</li>
            </ul>
          </div>
        </v-radio-group>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-btn icon="mdi-close" @click="onCancel()"/>
      <v-spacer />
      <div v-if="legacyVoice==='new'">
        <v-btn id="legacy-commit" icon="mdi-check-bold" 
          :disabled="legacyVoice==='ask'"
          @click="onSave()"
          class="recommend"
        ></v-btn>
      </div>
      <div v-if="legacyVoice!=='new'">
        <v-btn id="legacy-commit" icon="mdi-check-bold" 
          :disabled="legacyVoice==='ask'"
          @click="onSave()"
        ></v-btn>
      </div>
    </v-card-actions>
  </v-card>
  </v-dialog>
</template>
<script setup>
  import { 
    onUpdated, inject, nextTick, computed, ref, onMounted,
  } from "vue";
  import { useSettingsStore } from "../stores/settings.mjs";
  import { useVolatileStore } from "../stores/volatile.mjs";
  import { DEBUG_LEGACY, DEBUG_STARTUP } from '../defines.mjs';
  const msg = "LegacyVoice.setup()"
  const config = inject('config');
  const i18n = inject('i18n');

  // WARNING: Settings is not loaded yet in setup!
  const settings = useSettingsStore();
  const volatile = useVolatileStore();
  const showLegacyDialog = ref(false);

  const legacyVoice = ref();
  const voiceUrl = computed(()=>{
    const VOICE = "https://voice.suttacentral.net/scv/#/";
    const hash = location.hash.replace("#/sutta/",'');
    let [search,lang] = hash.split('/');
    search = search.split(':')[0];
    return `${VOICE}?search=${search}&lang=${lang}`;
  });

  const lang = computed(()=>{
    const hash = location.hash.replace("#/sutta/",'');
    let [search,lang='en'] = hash.split('/');
    return lang.toUpperCase();
  });

  onMounted(()=>{
    const msg = 'LegacyVoice.onMounted()';
    // let { locale } = i18n;
    // console.log(msg, {locale});
  });

  function onChangedChoice(evt) {
    const msg = 'LegacyVoice.onChangedChoice()';
    let dbg = DEBUG_STARTUP;
    switch (legacyVoice.value) {
      case 'old': {
        nextTick(()=>{
          let eltSave = document.getElementById('legacy-commit');
          dbg && console.log(msg, `[1]${legacyVoice.value}`, 
            {evt, eltSave});
          eltSave && eltSave.focus();
        });
        break;
      }
      default: {
        let eltSave = document.getElementById('legacy-commit');
        dbg && console.log(msg, `[2]${legacyVoice.value}`, 
          {evt, eltSave});
        break;
      }
    }
  }

  settings.loadSettings().then(()=>{
    const msg = 'LegacyVoice.loadSettings()';
    legacyVoice.value = settings.legacyVoice;
    if (legacyVoice.value === "ask") {
      legacyVoice.value = "new";
    }
    let { search='' } = location;
    let isSrcSC = search.search('src=sc') >= 0;
    let isSutta = location.hash.indexOf("#/sutta/") >= 0;

    if (isSrcSC && isSutta) {
      const hash = location.hash.replace("#/sutta/",'');
      let [hashSearch,lang] = hash.split('/');
      let langTrans = lang || settings.langTrans;
      console.log(msg, `langTrans ${settings.langTrans} <= ${langTrans}`);
      settings.langTrans = langTrans;
      let locale = langTrans;
      settings.locale = locale;
      //console.log(msg, `locale ${i18n.locale} <= ${locale}`);
      i18n.locale = locale;
    }

    showLegacyDialog.value = isSrcSC && settings.legacyVoice !== 'new';
  });

  function onClose() {
    const msg = 'LegacyVoice.onClose()';
    console.log(msg);
  }

  function onCancel() {
    showLegacyDialog.value = false;
  }

  async function onSave() {
    const msg = 'LegacyVoice.onSave()';
    let dbg = DEBUG_LEGACY;
    showLegacyDialog.value = false;
    settings.legacyVoice = legacyVoice.value;
    await settings.saveSettings();
    switch (settings.legacyVoice) {
      case 'new':
        location.search = '';
        dbg && console.log(msg, "[1]legacyVoice", settings.legacyVoice);
        break;
      case 'old': {
        location = voiceUrl.value;
        dbg && console.log(msg, "[2]legacyVoice", settings.legacyVoice);
        break;
      }
      default:
        dbg && console.log(msg, "[3]legacyVoice", settings.legacyVoice);
        break;
    }
  }

  function dimClass(value) {
    return legacyVoice.value === value
      ? ''
      : 'dim'
  }

  /*
  onUpdated(()=>{
    let dbg = DEBUG_STARTUP;
    nextTick(()=>{
      let msg = 'LegacyVoice.onUpdated()';
      let id = `r${legacyVoice.value}`;
      let eltId = document.getElementById(id);
      if (!eltId) {
        id = "rnew";
        eltId = document.getElementById(id);
        dbg && console.log(msg, '[1]', {id, eltId});
      }
      if (eltId && document.activeElement !== eltId) {
        dbg && console.log(msg, '[2]', {eltId});
        eltId.focus();
      }
    });
  });
  */
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
