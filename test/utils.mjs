import Utils from "../src/utils.mjs";
import should from "should";

typeof describe === "function" && describe("utils", function() {
  it("TESTTESTlogLine", () => {
    let args = [ 'hello', 1, true, ['a','b','c'], {color:'red'} ];
    should(Utils.logLine(...args))
      .equal('hello 1 true a,b,c {"color":"red"}');
    should(Utils.logLine.apply(null, args))
      .equal('hello 1 true a,b,c {"color":"red"}');
  });
  it ("assignTyped()", ()=>{
    let initial = {
      aString: 'init-string',
      aDate: new Date(2020,2,1),
      aBool: true,
      aNumber: 42,
      aArray: ['A'],
      aInitial: "initial",
    };
    let srcDate = new Date(2021, 3, 2);
    let src = {
      aString: 123,
      aDate: srcDate.toString(),
      aBool: "false",
      aIgnore: "ignore",
      aNumber: "123",
      aArray: ['B','C'],
    };
    let dst = {};
    should.deepEqual(Utils.assignTyped(dst, initial, src), {
      aString: "123", // override initial with src
      aDate: srcDate, // from src
      aBool: false, // convert src type
      aNumber: 123, // convert src type
      aArray: ['B','C'],
    });
  });
})
