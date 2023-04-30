import { list, getRedis } from '../../src/index.js';

console.error('Runner [started]');

console.error(await list('muppets'));

// setTimeout(() => process.exit(0), 20000);

console.error('Runner [complete]');

await (await getRedis()).disconnect();
