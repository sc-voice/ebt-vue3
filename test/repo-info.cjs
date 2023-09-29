(typeof describe === 'function') && describe("repo-info", function () {
  const should = require("should");
  const RepoInfo = require("../src/repo-info.cjs");

  it("info => repository info", async () => {
    let info = await RepoInfo.info();
    should.deepEqual(info, {
      account: 'sc-voice',
      repository: 'ebt-vue3',
    });
  });
})
