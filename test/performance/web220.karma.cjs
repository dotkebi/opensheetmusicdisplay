/* global require, module, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
module.exports = config => {
  const root = path.resolve(__dirname, "../..");
  require(path.join(root, "karma.conf.js"))(config);
  config.set({basePath: root, files: [
    {pattern:"test/performance/Web220Benchmark.ts",included:true},
    {pattern:"test/data/*.xml",included:true},
    {pattern:"test/data/*.musicxml",included:true}],
    browsers:["ChromeHeadless"],singleRun:true});
};
