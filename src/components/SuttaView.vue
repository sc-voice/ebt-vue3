<template>
  <v-sheet :class="suttaClass"
    :id="card.autofocusId"
    @click="onClickSutta"
    @keydown='onKeyDownSutta'
    @focus='onFocusSutta'
    @blur='onBlurSutta'
    tabindex=0
  >
    <tipitaka-nav :card="card"/>
    <div class="sutta-title">
      <div v-for="t in title"> {{t}} </div>
    </div> <!-- sutta-title -->
    <template v-if="idbSuttaRef">
      <segment-header 
        :segment="headerSeg"
        :idbSuttaRef="idbSuttaRef"
        :card="card"
        :routeCard="routeCard"
      />
    </template>
    <template v-for="seg in idbSuttaSegments">
      <segment-view 
        :segment="seg"
        :idbSuttaRef="idbSuttaRef"
        :card="card"
        :routeCard="routeCard"
      />
    </template>
    <tipitaka-nav :card="card" class="mt-3"/>
  </v-sheet>
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useSuttasStore } from '../stores/suttas.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { logger } from "log-instance/index.mjs";
  import { AuthorsV2, Examples, Tipitaka, SuttaRef } from "scv-esm";
  import { nextTick, ref } from "vue";
  import { default as IdbSutta } from '../idb-sutta.mjs';
  import * as Idb from "idb-keyval";
  import { default as SegmentView } from './SegmentView.vue';
  import { default as SegmentHeader } from './SegmentHeader.vue';
  import { default as TipitakaNav } from './TipitakaNav.vue';
  import { 
    DBG_MOUNTED, DBG_KEY, DBG_SCROLL, DBG_FOCUS,
  } from '../defines.mjs';
  const EXAMPLE_TEMPLATE = IdbSutta.EXAMPLE_TEMPLATE;

  export default {
    inject: ['config'],
    props: {
      card: { type: Object, required: true, },
      routeCard: { type: Object, required: true },
    },
    setup() {
      return {
        audio: useAudioStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
        suttas: useSuttasStore(),
        idbSuttaRef: ref(null),
        taka: new Tipitaka(),
        showTakaNav: ref(false),
      }
    },
    components: {
      SegmentView,
      SegmentHeader,
      TipitakaNav,
    },
    async mounted() {
      const msg = 'SuttaView.mounted() ';
      const dbg = DBG_MOUNTED;
      let { $route, suttas, settings, volatile, card, config, } = this;
      let { fullPath } = $route;
      let { development, langTrans } = settings;
      let { id, location, data } = card;
      let ref = {
        sutta_uid:location[0], 
        lang:location[1], 
        author:location[2],
      }
      let suttaRef = SuttaRef.create(ref);
      if (suttaRef == null) {
        let eMsg = `Invalid SuttaRef ${JSON.stringify(ref)}`;
        console.log(msg, eMsg);
        volatile.alert(eMsg);
        settings.removeCard(card, config);
        volatile.setRoute(config.homePath, undefined, msg);
        return;
      }
      let { sutta_uid, lang, author, segnum } = suttaRef;
      let idbKey = IdbSutta.idbKey({sutta_uid, lang, author});
      dbg && console.log(msg, `[1]suttaRef:${suttaRef}`, {idbKey});
      let idbSuttaRef = await suttas.getIdbSuttaRef({
        sutta_uid, lang, author});
      dbg && console.log(msg, `[2]loaded`, {idbSuttaRef});
      let { langTrans:defaultLang } = settings;
      this.idbSuttaRef = idbSuttaRef?.value;

      card.onAfterMounted({settings, volatile});
    },
    methods: {
      onKeyDownSutta(evt) {
        const msg = "SuttaView.onKeyDownSutta()";
        const dbg = DBG_KEY;
        const { card, settings } = this;
        let { audio } = this;
        switch (evt.code) {
          case 'Tab': {
            let elt;
            if (evt.shiftKey) {
              elt = document.getElementById(card.tab1Id);
              dbg && console.log(msg, '[1]focus', {elt,evt});
            } else {
              elt = document.getElementById('ebt-chips');
              dbg && console.log(msg, '[2]focus', {elt,evt});
            }
            elt && elt.focus();
            evt.preventDefault();
            break;
          }
          default:
            dbg && console.log(msg, '[2]audio.keydown', {evt});
            audio.keydown(evt);
            break;
        }
      },
      onFocusSutta(evt) {
        const msg = "SuttaView.onFocusSutta()";
        let { settings, audio, card } = this;
        audio.audioFocused = true;
        let segmentElementId = card.segmentElementId();
        //console.log(msg, segmentElementId);
        //settings.scrollToElementId(segmentElementId);
      },
      onBlurSutta(evt) {
        let { audio } = this;
        audio.audioFocused = false;
      },
      hrefSuttaCentral(sutta_uid) {
        return `https://suttacentral.net/${sutta_uid}`;
      },
      onClickSutta(evt) {
        let { $refs, card } = this;
        const msg = 'SuttaView.onClickSutta()';
        //console.log(msg, "DEBUG", {evt, card});
        let elt = card.focusElementId();
      },
    },
    computed: {
      idbSuttaSegments(ctx) {
        return ctx.idbSuttaRef?.segments || [];
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
      currentScid(ctx) {
        let { card } = ctx;
        return card.location[0];
      },
      suttaClass(ctx) {
        let { nCols, volatile } = ctx;
        switch (nCols) {
          case 3: return "sutta sutta-3col";
          case 2: return "sutta sutta-2col";
          default: return "sutta sutta-1col";
        }
      },
      nCols(ctx) {
        let { volatile, settings } = ctx;
        let { displayBox } = volatile;
        let w = displayBox.value.w;
        let nCols = 0;
        settings.showPali && nCols++;
        settings.showReference && nCols++;
        settings.showTrans && nCols++;
        settings.fullLine && (nCols = 1);
        switch (nCols) {
          case 3: 
            nCols = w < 820 ? 1 : nCols;
            break;
          case 2: 
            nCols = w < 566 ? 1 : nCols;
            break;
        }
        return nCols;
      },
      langTrans(ctx) {
        let { settings, card } = ctx;
        let { location } = card;
        return location[1] || settings.langTrans;
      },
      title(ctx) {
        let { idbSuttaRef } = ctx;
        let title = idbSuttaRef?.title || '(no-title)';
        return title.split('\n');
      },
      displayBox(ctx) {
        return ctx.volatile.displayBox.value;
      },
      takaNavIcon(ctx) {
        let { showTakaNav } = ctx;
        return showTakaNav 
          ? 'mdi-arrow-collapse-horizontal' 
          : 'mdi-arrow-expand-horizontal'
      },
      headerSeg(ctx) {
        let { $t, idbSuttaRef, settings } = ctx;
        let { showReference } = settings;
        let { 
          author, lang,
          docLang, docAuthor, refAuthor, refLang, trilingual,
        } = idbSuttaRef;

        docLang = docLang || lang;
        docAuthor = docAuthor || author;
        let docInfo = AuthorsV2.authorInfo(docAuthor);
        let docText = docInfo && docInfo.name.join(', ') || "docAuthor?";

        refLang = refLang || settings.refLang;
        refAuthor = refAuthor || AuthorsV2.langAuthor(refLang);
        let refInfo = AuthorsV2.authorInfo(refAuthor);
        let refText = refInfo?.name.join(', ');
        let refKey = trilingual ? "ref" : refLang;
        let seg =  Object.assign({}, {
          scid: $t('ebt.author'),
          pli: 'Mahāsaṅgīti',
          [docLang]: docText,
          [refKey]: refText,
        });
        return seg;
      },
    },
  }
</script>

<style >
</style>

