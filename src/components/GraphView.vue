<template>
  <v-sheet>
    <div class="d3-graph">
      <div v-if="selectedNode" class="d3-selection">
        <a :href="selectedHref()">{{selectedText()}}</a>
      </div>
      <div :id="svgId" @click.stop.prevent="clickGraph">
        <!--chart goes here-->
      </div>
    </div>
  </v-sheet>
</template>

<script setup>
  import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
  import { default as EbtD3 } from '../ebt-d3.mjs';
  import { useSettingsStore } from '../stores/settings.mjs';
  import { useAudioStore } from '../stores/audio.mjs';
  import { useVolatileStore } from '../stores/volatile.mjs';
  import { default as IdbAudio } from '../idb-audio.mjs';
  import { SuttaRef } from 'scv-esm';
  import { DBG_GRAPH } from '../defines.mjs';
  import { ref, computed, onMounted } from "vue";

  const selectedNode = ref(null);

  const svgId = computed(()=>{
    let { card } = props;
    return `svg-${card.id}`;
  })

  const props = defineProps({
    card: Object,
  });

  class D3Graph {
    static createSvg(data, sutta_uid, selId) {
      // Specify the dimensions of the chart.

      // Specify the color scale.
      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // The force simulation mutates links and nodes, so create a copy
      // so that re-evaluating this cell produces the same result.
      const links = data.links.map(d => ({...d}));
      const nodes = data.nodes.map(d => ({...d}));

      const large = nodes.length > 200;
      const width = large ? 800 : 550;
      const height = width;

      // Create a simulation with several forces.
      const simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).id(d => d.id))
          .force("charge", d3.forceManyBody())
          .force("x", d3.forceX())
          .force("y", d3.forceY());

      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [-width / 2, -height / 2, width, height])
          .attr("style", "max-width: 100%; height: auto;");

      // Add a line for each link, and a circle for each node.
      const link = svg.append("g")
          .attr("stroke", "#999")
          .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
          .attr("stroke-width", d => Math.sqrt(d.value));

      const node = svg.append("g")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
          .attr("r", d => d.id===sutta_uid ? 10 : 5)
          .attr("fill", d => color(d.group));

      node.append("title")
          .text(d => d.id);

      // Add a drag behavior.
      node.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
      
      // Set the position attributes of links and nodes each time the simulation ticks.
      simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
      });

      // Reheat the simulation when drag starts, and fix the subject position.
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      // Update the subject (dragged node) position during drag.
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      // Restore the target alpha so the simulation cools after dragging ends.
      // Unfix the subject position now that it’s no longer being dragged.
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      // When this cell is re-run, stop the previous simulation. 
      // (This doesn’t really matter since the target alpha is 
      // zero and the simulation will stop naturally, but it’s
      // a good practice.)
      //invalidation.then(() => simulation.stop());

      return svg.node();
    }

  }

  onMounted(async ()=>{
    const msg = "GraphView.onMounted()";
    const dbg = DBG_GRAPH;
    let { docLang } = useSettingsStore();
    let { 
      sutta_uid, 
      lang, 
      author 
    } = SuttaRef.create(props.card.location.join("/"), docLang);
    let ed3 = await EbtD3.create({lang});
    let graph = ed3.slice({nodePat:sutta_uid, depth:2});
    let svgContainer = document.getElementById(svgId.value);
    let svg = D3Graph.createSvg(graph, sutta_uid, selectedNode);
    selectedNode.value = { id: sutta_uid };
    dbg && console.log(msg, '[1]append', {lang,sutta_uid}, graph, svg);
    svgContainer.append(svg);
  });

  function clickGraph(evt) {
    const msg = "GraphView.clickGraph()";
    const dbg = DBG_GRAPH;
    let data = evt?.srcElement?.__data__;
    if (data) {
      selectedNode.value = data;
      dbg && console.log(msg, data, evt, selectedHref(), selectedText());
    }
  }

  function selectedText() {
    let { id } = selectedNode.value || {};
    return id;
  }

  function selectedHref() {
    let { id, group } = selectedNode.value || {};
    let { card } = props;
    let { location } = card;
    let [ cardSuttaId, lang, author ] = location;

    if (group == null) {
      return "";
    }
    if (group === 'Examples') {
      return `#/search/${id}`;
    }
    return `#/sutta/${id}/${lang}/${author}`;
  }

</script>

<style>
.d3-graph {
  display: flex;
  flex-flow: column;
  align-items: center;
}
.d3-selection {
  color: red;
}
</style>

