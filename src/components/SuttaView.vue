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
        :title="$t('ebt.author')"
      />
    </template>
    <template v-for="seg in idbSuttaSegments" 
      :key="segKey(card,seg)">
      <segment-view 
        :id="segKey(card, seg)"
        :segment="seg"
        :idbSuttaRef="idbSuttaRef"
        :card="card"
        :routeCard="routeCard"
      />
    </template>
    <template v-if="idbSuttaRef">
      <segment-header 
        :segment="footerSeg"
        :idbSuttaRef="idbSuttaRef"
        :card="card"
        :routeCard="routeCard"
        title=""
        class="seg-footer"
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
  import Utils from '../utils.mjs';
  import { logger } from "log-instance/index.mjs";
  import { AuthorsV2, Examples, Tipitaka, SuttaRef } from "scv-esm";
  import { nextTick, ref } from "vue";
  import { default as IdbSutta } from '../idb-sutta.mjs';
  import * as Idb from "idb-keyval";
  import { default as SegmentView } from './SegmentView.vue';
  import { default as SegmentHeader } from './SegmentHeader.vue';
  import { default as TipitakaNav } from './TipitakaNav.vue';
  import { 
    DBG,
    DBG_CLICK, DBG_KEY, 
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
      const dbg = DBG.MOUNTED;
      let { $route, suttas, settings, volatile, card, config, } = this;
      let { fullPath } = $route;
      let { 
        development, langTrans, docLang, docAuthor, refLang, refAuthor 
      } = settings;
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
      dbg && console.log(msg, `[1]suttaRef:${suttaRef}`, {id, sutta_uid});
      let idbSuttaRef = await suttas.getIdbSuttaRef({
        sutta_uid, lang, author});
      dbg && console.log(msg, `[2]loaded`, {id, idbSuttaRef, sutta_uid});
      let { langTrans:defaultLang } = settings;
      this.idbSuttaRef = idbSuttaRef?.value;

      card.onAfterMounted({settings, volatile});
    },
    watch: {
      'card.location': {
        async handler(newLoc, oldLoc) {
          const msg = 'SuttaView.watch.card.location()';
          const dbg = DBG.MOUNTED;

          // Skip if no previous location (initial mount handles this)
          if (!oldLoc || !newLoc) return;

          // Skip if same sutta_uid (just segment change)
          if (newLoc[0] === oldLoc[0]) return;

          dbg && console.log(msg, '[1]location changed', {newLoc, oldLoc});

          // Reload sutta data for new location
          let { suttas, settings, volatile, card, config } = this;
          let ref = {
            sutta_uid: newLoc[0],
            lang: newLoc[1],
            author: newLoc[2],
          };
          let suttaRef = SuttaRef.create(ref);
          if (suttaRef == null) {
            let eMsg = `Invalid SuttaRef ${JSON.stringify(ref)}`;
            console.log(msg, eMsg);
            volatile.alert(eMsg);
            return;
          }
          let { sutta_uid, lang, author } = suttaRef;
          dbg && console.log(msg, `[2]reloading suttaRef:${suttaRef}`);
          let idbSuttaRef = await suttas.getIdbSuttaRef({
            sutta_uid, lang, author
          });
          this.idbSuttaRef = idbSuttaRef?.value;

          card.onAfterMounted({settings, volatile});
        },
        deep: true,
      },
    },
    methods: {
      segKey(card, seg) {
        let rawId = `${seg.scid}_CARD${card.id.substring(0,8)}`;
        return rawId.replaceAll('.',"_").replaceAll(/:/g,"__");
      },
      onKeyDownSutta(evt) {
        const msg = "SuttaView.onKeyDownSutta()";
        const dbg = DBG_KEY;
        const dbgv = DBG.VERBOSE && dbg;
        const { audio, card, settings, volatile } = this;
        let { shiftKey, ctrlKey, code } = evt;
        switch (code) {
          case 'Tab': {
            let elt;
            if (evt.shiftKey) {
              elt = document.getElementById(card.tab1Id);
              dbg && console.log(msg, '[1]focus', {elt,evt});
            } else {
              elt = document.getElementById('ebt-chips');
              dbg && console.log(msg, '[2]focus', {elt,evt});
            }
            elt && volatile.focusElement(elt);
            evt.preventDefault();
          } break;
          default:
            dbg && console.log(msg, '[2]audio.keydown', {evt});
            audio.keydown(evt);
            break;
        }
      },
      onFocusSutta(evt) {
        const msg = "SuttaView.onFocusSutta()";
        const dbg = DBG.FOCUS;
        let { volatile, settings, audio, card } = this;
        audio.audioFocused = true;
        let segmentElementId = card.segmentElementId();
        let appFocus = evt.target;
        dbg && console.log(msg, '[1]appFocus', appFocus.id);
        volatile.appFocus = appFocus;
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
        const msg = 'SuttaView.onClickSutta()';
        const dbg = DBG_CLICK;
        let { $refs, card, volatile } = this;
        dbg && console.log(msg, '[1]focusCardElementId', 
          card.debugString);
        let elt = volatile.focusCardElementId(card);
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
        let n = 0;

        if (settings.showPali) { n++ }
        if (settings.showReference) { n++ }
        if (settings.showTrans) { n++ }
        if (settings.fullLine) { n = 1 }
        switch (n) {
          case 3: 
            n = w < 820 ? 1 : n;
            break;
          case 2: 
            n = w < 566 ? 1 : n;
            break;
        }
        return n;
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
        const msg = "SuttaView.headerSeg()";
        let { $t, idbSuttaRef, settings } = ctx;
        let { showReference } = settings;
        let { 
          author, lang, trilingual,
          docLang, docAuthor, docAuthorName,
          refAuthor, refLang, refAuthorName,
        } = idbSuttaRef;

        docLang = docLang || lang;
        docAuthor = docAuthor || author;
        let docInfo = AuthorsV2.authorInfo(docAuthor, docLang);
        let docText = docInfo && docInfo.name.join(', ') ||
          docAuthorName || "–∅–";

        refLang = refLang || settings.refLang;
        refAuthor = refAuthor || AuthorsV2.langAuthor(refLang);
        let refInfo = AuthorsV2.authorInfo(refAuthor);
        let refText = refInfo?.name.join(', ') || refAuthorName;
        let refKey = trilingual ? "ref" : refLang;
        let seg =  Object.assign({}, {
          scid: $t('ebt.author'),
          pli: 'Mahāsaṅgīti',
          [docLang]: docText,
          [refKey]: refText,
        });
        return seg;
      },
      footerSeg(ctx) {
        const msg = "SuttaView.footerSeg()";
        let { $t, idbSuttaRef, settings } = ctx;
        let { showReference } = settings;
        let { 
          trilingual, docLang, lang, docFooter = 'df?', refFooter='rf?', 
        } = idbSuttaRef;

        let msInfo = AuthorsV2.authorInfo('ms', 'pli');
        let refKey = trilingual ? "ref" : refLang;

        let seg =  Object.assign({}, {
          scid: $t('ebt.footer'),
          pli: msInfo.name,
          [docLang||lang]: docFooter,
          [refKey]: refFooter,
        });
        return seg;
      },
    },
  }
</script>

<style >
</style>

