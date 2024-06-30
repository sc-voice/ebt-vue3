<template>
  <div :id="segId" class="seg-anchor" >
    <span class="debug" v-if="logger.logLevel==='debug'">
      {{segment.scid}}
    </span>
  </div>
  <div v-if="segment.scid === cardScid"
    class="segment-menu"
  >
    <div class="pb-1">{{cardScid}}</div>
    <v-spacer/>
    <v-btn icon="mdi-pause"
      v-if="audio.playing"
      size="small"
      @click="audio.clickPlayOne()"
    ></v-btn>
    <v-btn icon="mdi-play-pause"
      v-if="!audio.playing"
      size="small"
      @click="audio.clickPlayOne()"
    ></v-btn>
    <v-btn icon="mdi-play"
      v-if="!audio.playing"
      size="small"
      @click="audio.clickPlayToEnd()"
    ></v-btn>
    <v-menu offset-y class="ebt-menu">
      <template v-slot:activator="{ props }">
        <v-btn
          size="small"
          dark
          v-bind="props"
          icon="mdi-link-plus"
        >
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(item, index) in menuItems" :key="index"
          @click="menuClick(item.action)"
          :disabled="item.suttacentral && !isSCDocument"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
  <div :class="segMatchedClass(segment)"
    :id="id"
    @click.left='onClickSegBody'
    :title="segment.scid"
  >
    <div class="seg-id" v-if="settings.showId"> 
      {{segment.scid}} 
    </div>
    <div :class="textClass()" >
      <div :class="langClass('root')" 
        v-if="settings.showPali"
        @click="clickPali"
        v-html="paliText(segment)" />
      <div :class="langClass('trans')" 
        v-if="settings.showTrans"
        v-html="langText" />
      <div :class="langClass('ref')" 
        v-if="settings.showReference"
        v-html="refText" />
    </div>
  <div v-if="showPaliWord"
    v-html="paliDefinition"
    class="pli-summary"
  ></div><!-- showPaliWord -->
  </div><!-- segMatchedClass -->
</template>

<script>
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { useSuttasStore } from '../stores/suttas.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { logger } from "log-instance/index.mjs";
  import { Examples, SuttaRef } from "scv-esm";
  import { getCurrentInstance, nextTick, ref } from "vue";
  import { default as IdbSutta } from '../idb-sutta.mjs';
  import { ACTION, DBG, } from '../defines.mjs';
  import Utils from "../utils.mjs";
  import * as Idb from "idb-keyval";
  const EXAMPLE_TEMPLATE = IdbSutta.EXAMPLE_TEMPLATE;
  const EMPTY_TEXT = '<div class="empty-text">&#8211;&#8709;&#8211;</div>'

  export default {
    inject: ['config'],
    props: {
      id: { type: String, required:true },
      segment: { type: Object, required:true },
      idbSuttaRef: { type: Object, required:true },
      card: { type: Object, required:true },
      routeCard: { type: Object, required:true },
    },
    setup() {
      return {
        audio: useAudioStore(),
        settings: useSettingsStore(),
        volatile: useVolatileStore(),
        suttas: useSuttasStore(),
        paliWord: ref(),
        logger,
      }
    },
    components: {
    },
    mounted() {
      const msg = "SegmentView.mounted()";
      const dbg = DBG.SEG_MOUNTED;
      let { volatile, segment, card, audio } = this;
      if (segment.scid === audio.audioScid) {
        let { segId, card, settings } = this;
        dbg && console.log(msg, segment?.scid);
        volatile.focusCardElementId(card);
        /* await */ volatile.scrollToCard(card);
      }
    },
    methods: {
      menuClick(action) {
        const msg = 'SegmentView.menuClick()';
        const dbg = DBG.COPY_SEG;
        const { 
          volatile, segment, card
        } = this;
        let [ defaultScid, lang, author ] = card.location;
        // Always use main API endpoint for copy segments.
        let serverUrl = "https://www.api.sc-voice.net/scv";
        let apiEndpoint = `${serverUrl}/ebt-site`;
        let scEndpoint = `https://suttacentral.com`;
        switch (action) {
          case ACTION.COPY_QUOTE: {
            dbg && console.log(msg, '[1]', action);
            volatile.copySegment({segment, lang, author});
          } break;
          case ACTION.COPY_DOC_LINK: {
            dbg && console.log(msg, '[2]', action);
            let href = card.scidToDocUrl(segment.scid);
            Utils.updateClipboard(href);
          } break;
          case ACTION.COPY_QUOTE_SC: {
            dbg && console.log(msg, '[3]', action);
            let href = card.scidToSCUrl(segment.scid, scEndpoint);
            volatile.copySegment({segment, href, lang, author});
          } break;
          case ACTION.COPY_DOC_LINK_SC: {
            dbg && console.log(msg, '[4]', action);
          } break;
          default: 
            dbg && console.log(msg, "[5]action?", action);
            break;
        }
      },
      onClickSegBody(evt) {
        const msg = 'SegmentView.onClickSegBody()';
        const dbg = DBG.CLICK_SEG;
        let { 
          segment, cardScid, routeCard, card, settings, 
          idbSuttaRef, volatile,
        } = this;
        let { target } = evt;
        let { className, innerText } = target;
        let { scid } = segment;
        dbg && console.log(msg, '[1]evt', scid, evt);

        if (cardScid === scid && routeCard === card) {
          if (className === 'ebt-example') {
            let pattern = encodeURIComponent(innerText);
            let hash = `#/search/${pattern}`;
            dbg && console.log(msg, 'example', scid, pattern);
            volatile.setRoute(hash, undefined, msg);
          }
        } else {
          let { context } = card;
          let [ locationScid, lang, author ] = card.location;
          let hash = `#/${context}/${scid}/${lang}/${author}`
          card.location[0] = scid;
          //console.log(msg, 'segment', scid);
          volatile.setRoute(hash, undefined, msg);
          //idbSuttaRef.highlightExamples({segment});
          this.paliWord = null;
        }
      },
      langClass(langType) {
        let { displayBox, volatile, nCols } = this;
        let colw = "lg";
        switch (nCols) {
          case 3:
            colw = displayBox.w < 1132 ? "sm" : "lg";
            break;
          case 1:
            colw = displayBox.w < 600 ? "sm" : "lg";
            break;
          default:
            colw = "lg";
            break;
        }
        return `seg-lang seg-${langType} seg-lang-${nCols}col-${colw}`;
      },
      textClass() {
        let { displayBox, volatile, nCols } = this;
        switch (nCols) {
          case 1:
            return "seg-text seg-text-1col";
            break;
          default:
            return "seg-text";
            break;
        }
      },
      paliText(seg) {
        let { cardScid } = this;
        let { pli } = seg;
        if (pli==null || cardScid!==seg.scid) {
          return pli;
        } 
        let words = pli.trim()
          .split(' ')
          .map(w=>`<span class="pli-word">${w}</span>`);
        ;
        return words.join(' ');
      },
      segMatchedClass(seg) {
        let { displayBox, card, cardScid, audio, routeCard } = this;
        let { audioFocused } = audio;
        let idClass = displayBox.w < 1200 
          ? "seg-id-col" 
          : "seg-id-row";
        let matchedClass = seg.matched 
          ? "seg-match seg-matched" 
          : "seg-match";
        let currentClass = seg.scid === cardScid 
          ? "seg-current" 
          : '';
        let audioClass = seg.scid === audio.audioScid && 
          routeCard === card &&
          audioFocused 
          ? "seg-audio" 
          : '';
        return [
          'seg-body',
          matchedClass,
          idClass,
          currentClass,
          audioClass,
        ].join(' ');
      },
      hrefSuttaCentral(sutta_uid) {
        return `https://suttacentral.net/${sutta_uid}`;
      },
      clickPali(evt) {
        const msg = "SegmentView.clickPali()";
        const dbg = DBG.CLICK_SEG;
        let { target } = evt;
        if (target?.className === "pli-word") {
          let text = target.firstChild.nodeValue;
          this.paliWord = text;
          dbg && console.log(msg, text, evt);
          evt.stopPropagation();
        }
      },
    },
    computed: {
      menuItems(ctx) {
        let { $t } = ctx;
        return [{
          title: $t('ebt.copyQuoteWithLink'),
          action: ACTION.COPY_QUOTE,
          suttacentral: false,
        },{
          title: $t('ebt.copyLinkToDocument'),
          action: ACTION.COPY_DOC_LINK,
          suttacentral: false,
        //},{
          //title: `Copy audio`,
        },{
          title: $t('ebt.copyQuoteWithLinkSC'),
          action: ACTION.COPY_QUOTE_SC,
          suttacentral: true,
        //},{
          //title: `Copy link to document (SuttaCentral)`,
          //action: ACTION.COPY_DOC_LINK_SC,
          //suttacentral: true,
        }]
      },
      isSCDocument(ctx) {
        let { card } = ctx;
        let [ scid, lang, author ] = card.location;
        return author !== 'ebt-deepl';
      },
      segBodyId(ctx) {
        let { card, segment } = ctx;
        return `${card.id}-${segment.scid}`;
      },
      segId(ctx) {
        let { segment, card } = ctx;
        return card.segmentElementId(segment.scid);
      },
      sutta_uid(ctx) {
        let { card } = ctx;
        let suttaRef = SuttaRef.create(card.location[0]);
        if (suttaRef == null) {
          return 'sutta_uid?';
        }
        return suttaRef.sutta_uid;
      },
      cardScid(ctx) {
        let { card } = ctx;
        return card.location[0];
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
      langText(ctx) {
        let { segment, langTrans, volatile } = ctx;
        let text = segment[langTrans] || EMPTY_TEXT;
        return text;
      },
      refText(ctx) {
        let { segment, } = ctx;
        let text = segment.ref || EMPTY_TEXT;
        return text;
      },
      displayBox(ctx) {
        return ctx.volatile.displayBox.value;
      },
      isCurrent(ctx) {
        let { segment, audio, } = ctx;
        return segment.scid === audio.audioScid;
      },
      showPaliWord(ctx) {
        let { volatile, cardScid, paliWord, segment } = this;
        let { dictionary } = volatile;
        return dictionary && cardScid===segment.scid && paliWord;
      },
      paliDefinition(ctx) {
        let { volatile, cardScid, paliWord, segment } = this;
        let { dictionary } = volatile;
        let entry = dictionary.entryOf(paliWord);
        let { definition=['?|?||'] } = entry || {};
        let paliLink = entry && entry.definition
          ? `<a href="#/pali/${paliWord}">${paliWord}</a>`
          : `<b>${paliWord}</b>`;
        return [
          paliLink,
          ...definition.map((d,i)=>{
            let [ type, meaning, literal, construction ] = d.split('|');
            let code = '①'.charCodeAt(0) + i;
            literal = literal ? `; <i>lit. ${literal}</i>` : '';
            return `${String.fromCharCode(code)}&nbsp;${meaning}${literal}`
          }),
        ].join(' ');
      },
    },
  }
</script>

<style >
.segment-menu {
  display: flex; 
  justify-content: flex-end;
  align-items: flex-end;
}
.pli-word:hover {
  color: rgb(var(--v-theme-link));
}
.pli-summary {
  padding: 0.5em;
  padding-top: 0em;
  padding-left: 1em;
  min-height: 3em;
  background-color: rgb(var(--v-theme-currentbg));
}
</style>

