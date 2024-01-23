import { EbtD3 } from "../index.mjs";
import should from "should";

(typeof describe ==='function') && 
 describe("ebt-d3.mjs", function () {
  const S1 = { id:'s1' }
  const S2 = { id:'s2' }
  const S3 = { id:'s3' }
  const E1 = { id:'e1' }
  const E2 = { id:'e2' }
  const E3 = { id:'e3' }
  const TEST_GRAPH = {
    nodes: [ S1, S2, S3, E1, E2, E3],
    links: [
      { source:'s1', target:'e1' },
      { source:'e1', target:'s2' },
      { source:'s2', target:'e2' },
      { source:'e2', target:'s3' },
      { source:'s3', target:'e3' },
    ],
  }

  it("default ctor", () => {
    let eCaught;
    try {
      let ed3 = new EbtD3();
    } catch(e) {
      eCaught = e;
    }
    should(eCaught.message).match(/create.*is required/);
  });
  it("create() default", async()=>{
    let ed3 = await EbtD3.create();
    should(ed3).properties({lang: 'en', author: 'sujato'});
    should(ed3.graphUrl).equal('https://raw.githubusercontent.com/sc-voice/scv-bilara/main/src/assets/esd3-en-sujato.json');
    should(ed3.graph.nodes.length).above(3000).below(4000);
    should(ed3.graph.links.length).above(5000).below(7000);
  });
  it("create() custom de", async()=>{
    let ed3_de = await EbtD3.create({lang:'de'});
    should(ed3_de).properties({lang: 'de', author: 'sabbamitta'});
    should(ed3_de.graphUrl).equal('https://raw.githubusercontent.com/sc-voice/scv-bilara/main/src/assets/esd3-de-sabbamitta.json');
    should(ed3_de.graph.nodes.length).above(3000).below(4000);
    should(ed3_de.graph.links.length).above(5000).below(7000);
  });
  it("slice() idPat s1 depth 1", async()=>{
    let idPat = 's1';
    let ed3 = await EbtD3.create({graph:TEST_GRAPH});
    let graph = ed3.slice({idPat});
    //console.log("slice", graph);
    should(graph.nodes.length).equal(2);
    should.deepEqual(graph.nodes, [ S1, E1 ]);
    should.deepEqual(graph.links, [
      { source: 's1', target: 'e1'}, 
    ]);
  });
  it("slice() idPat s1 depth 2", async()=>{
    let idPat = 's1';
    let depth = 2;
    let ed3 = await EbtD3.create({graph:TEST_GRAPH});
    let graph = ed3.slice({idPat, depth});
    //console.log("slice", graph);
    should.deepEqual(graph.nodes, [ S1, S2, E1 ]);
    should.deepEqual(graph.links, [
      { source: 's1', target: 'e1'}, 
      { source: 'e1', target: 's2'}, 
    ]);
  });
  it("slice() idPat s1 depth 3", async()=>{
    let idPat = 's1';
    let depth = 3;
    let ed3 = await EbtD3.create({graph:TEST_GRAPH});
    let graph = ed3.slice({idPat, depth});
    //console.log("slice", graph);
    should.deepEqual(graph.nodes, [ S1, S2, E1, E2 ]);
    should.deepEqual(graph.links, [
      { source: 's1', target: 'e1'}, 
      { source: 'e1', target: 's2'}, 
      { source: 's2', target: 'e2'}, 
    ]);
  });
  it("slice() idPat an3.5", async()=>{
    let idPat = 'an3.5'; // no examples
    let ed3 = await EbtD3.create();
    let graph = ed3.slice({idPat});
    should.deepEqual(graph.nodes, [{id:idPat}]);
    should(graph.links.length).equal(0);
  });
  it("slice() idPat mn44", async()=>{
    let idPat = 'mn44';
    let ed3 = await EbtD3.create();
    let graph = ed3.slice({idPat});
    should(graph.nodes.length).above(10).below(100);
    should(graph.links.length).above(9).below(100);
  });
  it("TESTTESTslice() idPat depth", async()=>{
    let idPat = 'mn44';
    let depth = 2;
    let ed3 = await EbtD3.create();
    let graph = ed3.slice({idPat, depth});
    should(graph.nodes.length).above(140).below(500);
    should(graph.links.length).above(155).below(500);
  });
});
