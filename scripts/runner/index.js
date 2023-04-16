import { list, getRedis } from '../../src/index.js';

console.log(await list('muppets'));

// setTimeout(() => process.exit(0), 20000);
// const facts = await scanFiles('Coolest code', './');

await (await getRedis()).disconnect();
