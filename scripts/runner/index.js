
import {
  getRedis,
  retry as run,
  jsRepoMapNFR as mapNFRs,
} from '../../src/index.js';

await run(async () => {
  await mapNFRs({
    node: { filename: './src/index.js' },
    schemaName:'prompt',
  });
}, { maxRetries: 0 });

await (await getRedis()).disconnect();
