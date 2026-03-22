/**
 * Per-worker sensitivity model probe.
 *
 * Quick reachability check for the local Ollama/OpenWebUI sensitivity model.
 * Sets SENSITIVITY_TEST_SKIP=true in-process if unreachable, so tests that
 * import `env.SENSITIVITY_TEST_SKIP` see the correct value.
 *
 * Runs once per fork (max 2 forks), NOT per test file. The 3s timeout
 * means worst case adds 3s to worker startup, not the 15s warm-up probe.
 */

import { models } from '../../src/constants/model-mappings.js';

const REACHABILITY_TIMEOUT = 3_000;

if (models.sensitive?.apiUrl && !process.env.SENSITIVITY_TEST_SKIP) {
  try {
    const url = `${models.sensitive.apiUrl}${models.sensitive.endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${models.sensitive.apiKey}`,
      },
      body: JSON.stringify({
        model: models.sensitive.name,
        messages: [{ role: 'user', content: 'hi' }],
        think: false,
        keep_alive: '30m',
        options: { num_ctx: 4096, num_predict: 256 },
      }),
      signal: AbortSignal.timeout(REACHABILITY_TIMEOUT),
    });
    if (!response.ok) throw new Error(`${response.status}`);
  } catch {
    process.env.SENSITIVITY_TEST_SKIP = 'true';
  }
}
