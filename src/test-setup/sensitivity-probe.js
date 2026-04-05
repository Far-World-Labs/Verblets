/**
 * Per-worker sensitivity model probe.
 *
 * Quick reachability check for the local Ollama/OpenWebUI sensitivity model.
 * Sets VERBLETS_SENSITIVITY_TEST_SKIP=true in-process if unreachable, so tests that
 * import `env.VERBLETS_SENSITIVITY_TEST_SKIP` see the correct value.
 *
 * Runs once per fork (max 2 forks), NOT per test file. The 3s timeout
 * means worst case adds 3s to worker startup, not the 15s warm-up probe.
 */

import { findRule, resolveCatalogEntry } from '../../src/constants/model-mappings.js';

const REACHABILITY_TIMEOUT = 3_000;

const sensitiveRule = findRule('sensitive');
const sensitiveModel = sensitiveRule ? resolveCatalogEntry(sensitiveRule.use) : undefined;

if (sensitiveModel?.apiUrl && !process.env.VERBLETS_SENSITIVITY_TEST_SKIP) {
  try {
    const url = `${sensitiveModel.apiUrl}${sensitiveModel.endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sensitiveModel.apiKey}`,
      },
      body: JSON.stringify({
        model: sensitiveModel.name,
        messages: [{ role: 'user', content: 'hi' }],
        think: false,
        keep_alive: '30m',
        options: { num_ctx: 4096, num_predict: 256 },
      }),
      signal: AbortSignal.timeout(REACHABILITY_TIMEOUT),
    });
    if (!response.ok) throw new Error(`${response.status}`);
  } catch {
    process.env.VERBLETS_SENSITIVITY_TEST_SKIP = 'true';
  }
}
