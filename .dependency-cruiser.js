
module.exports = {
  forbidden: [],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    exclude: {
      path: "\\.(spec|test)\\."
    },
    moduleSystems: ["amd", "cjs", "es6", "tsd"],
    outputType: "json"
  }
};
