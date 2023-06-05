
import {
  getRedis,
  retry as run,
  scanJS,
} from '../../src/index.js';

await run(async () => {
  const results = await scanJS({
    node: { filename: './src/index.js' },
    features: 'prompt engineering',
  });

  console.error(results);
}, { maxRetries: 0 });

await (await getRedis()).disconnect();
