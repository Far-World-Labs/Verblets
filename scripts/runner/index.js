import { list, getRedis } from '../../src/index.js';

// console.log(await list('muppets'));

// setTimeout(() => process.exit(0), 20000);
// const facts = await scanFiles('Coolest code', './');

import dependencyTree from "dependency-tree";

  const config = {
    filename: './src/index.js',
    directory: './src/',
    nodeModulesConfig: { entry: "module" },
    nonExistent: [],
    filter: (p) => p.indexOf("node_modules") === -1,
  };

  console.log(JSON.stringify(dependencyTree(config), null, 2));


await (await getRedis()).disconnect();
