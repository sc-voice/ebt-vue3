<template>
  <div id="ebt-chips" 
    class="chip-container" tabindex=0
    @keydown.tab.exact.prevent="onTab"
    @keydown.right.exact.prevent="onNextChip(1)"
    @keydown.left.exact.prevent="onNextChip(-1)"
    @keydown.space.exact.stop.prevent="onSpace"
    @keydown.enter.exact.stop.prevent="onEnter"
  >
    <v-chip-group v-model="filteredChips" column>
      <div v-for="card in settings.cards" :key="card.id">
        <v-chip 
          :prepend-icon="card.icon"
          @click="onClickChip(card, settings.cards)"
          draggable
          tabindex=-1
          @dragstart="startDrag($event, card)"
          @drop="onDrop($event, card, settings)"
          @dragover.prevent
          @dragenter.prevent
          :rounded="0"
          :class="chipClass(card, volatile)"
          :title="card.chipTitle()"
        >
          <div class="chip-title">{{card.chipTitle($t)}}</div>
        </v-chip>
      </div>
    </v-chip-group>
  </div>
</template>

<script>
  import { default as EbtCard } from '../ebt-card.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { ref, nextTick } from "vue";
  import { logger } from "log-instance/index.mjs";
  import {
    DBG,
    DBG_CLICK, DBG_OPEN_CARD, DBG_KEY,
  } from "../defines.mjs";

  export default {
    inject: ['config'],
    setup() {
      const settings = useSettingsStore();
      const volatile = useVolatileStore();

      return {
        settings,
        volatile,
      }
    },
    mounted() {
      let { volatile } = this;
      volatile.ebtChips = document.getElementById('ebt-chips');
    },
    methods: {
      onSpace(evt) {
        const msg = 'EbtChips.onSpace() ';
        const dbg = DBG_KEY;
        let { volatile, settings } = this;
        let { routeCard } = volatile;
        if (routeCard) {
          dbg && console.log(msg, '[1]~open', routeCard.debugString);
          routeCard.open(!routeCard.isOpen);
        }
      },
      onEnter(evt, card) {
        const msg = 'EbtChips.onEnter() ';
        let { volatile, settings } = this;
        let { routeCard } = volatile;
        const dbg = DBG_KEY;
        if (routeCard) {
          dbg && console.log(msg, '[1]~open', routeCard.debugString);
          routeCard.open(!routeCard.isOpen);
        }
      },
      onNextChip(delta) {
        let msg = `EbtChips.onNextChip(${delta})`;
        let { volatile, settings } = this;
        let { routeCard } = volatile;
        let { cards } = settings;
        let nextIndex = 0;

        if (routeCard) {
          let index = cards.indexOf(routeCard);
          nextIndex = (index + delta + cards.length) % cards.length;
        }
        let card = cards[nextIndex];
        let keepFocus = false;
        switch (card.context) {
          case EbtCard.CONTEXT_PLAY:
          case EbtCard.CONTEXT_SUTTA:
            keepFocus = true;
            break;
        }
        volatile.setRoute(card, keepFocus);
      },
      async onTab(evt) {
        let msg = "EbtChips.onTab()";
        let dbg = DBG_KEY;
        let { volatile, settings } = this;
        let { routeCard } = volatile;
        if (routeCard) {
          dbg && console.log(msg, routeCard.debugString);
          settings.openCard(routeCard);
          nextTick(
            ()=>volatile.focusCardElementId(routeCard)
          );
        }
      },
      startDrag(evt, card) {
        evt.dataTransfer.dropEffect = 'move'
        evt.dataTransfer.effectAllowed = 'move'
        evt.dataTransfer.setData('srcCardId', card.id)
      },
      onDrop(evt, dstCard, settings) {
        let { cards } = settings;
        const srcCardId = evt.dataTransfer.getData('srcCardId')
        const srcIndex = cards.findIndex(elt => elt.id === srcCardId);
        const dstIndex = cards.findIndex(elt => elt === dstCard);
        settings.moveCard(srcIndex, dstIndex);
      },
      updateActive: (evt) => {
        logger.info(`updateActive`, evt);
      },
      async onClickChip(card, cards) {
        const msg = `EbtChips.onClickChip() ${card?.id} `;
        const dbg = DBG.CLICK_CHIP || DBG_CLICK || DBG.FOCUS;
        const settings = await useSettingsStore();
        const volatile = await useVolatileStore();
        let { ebtChips } = volatile;
        dbg && console.log(msg, "[1]focus", {card, });
        ebtChips && volatile.focusElement(ebtChips);
        volatile.setRoute(card, true);
        if (card.isOpen) {
          dbg && console.log(msg, "[2]open", {card, });
        } else {
          dbg && console.log(msg, "[3]opening", {card, });
          card.open(true);
          let scrolled = await volatile.scrollToCard(card);
          if (!scrolled) {
            let { topAnchor, currentElementId } = card;
            if (currentElementId !== topAnchor) {
              await settings.scrollToElementId(topAnchor);
            }
          }
        }
        switch (card.context) {
          case EbtCard.CONTEXT_WIKI:
            settings.tutorWiki = false;
            break;
        }
      },
      onClose: (card, settings) => { // DEPRECATED
        let { cards } = settings;
        logger.info(`onClose removing card ${card.id}`);
        nextTick(() => settings.removeCard(card, config));
      },
      closable: (card, settings) => { // DEPRECATED
        const IS_PHONE = 1; // save space for iPhone
        return !IS_PHONE && settings.cards.length > 1
          ? !card.isOpen && card.context !== EbtCard.CONTEXT_WIKI
          : false;
      },
      chipClass(card) {
        let { volatile } = this;
        let chipClass = [];

        card.context === EbtCard.CONTEXT_WIKI && 
          chipClass.push('chip-home');
        chipClass.push(card.isOpen ? 'chip-open' : 'chip-closed');
        card.isOpen && card.visible && chipClass.push('card-in-view');
        if (card?.id === volatile.routeCard?.id) {
          chipClass.push('chip-route-card');
        }
        return chipClass.join(' ');
      },
    },
    computed: {
      filteredChips: {
        get: (ctx)=>{
          return [];
        },
        set: (value)=>{ 
          // do nothing
        },
      },
    },
  }
</script>
<style >
  .v-chip {
    margin-top: 1px !important;
    margin-bottom: 1px !important;
  }
  .chip-container {
    display: flex;
    flex-direction: column;
    min-height: 32px;
    margin-left: 1.0rem;
    margin-bottom: 4px;
    width: calc(100% - 1.5rem);
    border: 1.5px dashed rgba(var(--v-theme-focus), 0) !important;
    outline: none;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  .chip-container .v-chip-group {
    padding: 0px !important;
  }
  .chip-container:focus {
    border: 1.5px dashed rgba(var(--v-theme-focus), 1) !important;
    outline: none;
  }
  .chip-title {
    display: inline-block;
    overflow: hidden;
    max-width: 30px;
    text-overflow: clip;
    padding-right: 0.4em;
  }
  .chip-closed {
    border-bottom: 1px dashed rgb(var(--v-theme-on-surface));
  }
  .chip-open {
    border-bottom: 1px solid rgb(var(--v-theme-on-surface));
    opacity: 0.6;
  }
  .v-chip.v-chip--size-default {
    padding-right: 0px;
  }
  .chip-route-card {
    border-bottom-color: rgb(var(--v-theme-focus));
    border-bottom-width: 3px;
  }
  .card-in-view {
    opacity: 1;
  }
  .chip-route-card .chip-title {
    max-width: 80px;
  }
  .chip-close {
    margin-right: -0.4em;
  }
  .chip-home {
    padding-right: 6pt;
  }
  @media (max-width:400px) {
    .chip-title {
      display: none;
    }
    .chip-route-card .chip-title {
      display: inline;
      max-width: 40px;
    }
    .chip-container {
      margin-left: 0rem;
    }
  }
</style>
