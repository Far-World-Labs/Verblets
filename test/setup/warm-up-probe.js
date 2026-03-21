/* global process */
/**
 * Global setup: warm-up probe for Ollama/OpenWebUI models.
 *
 * Runs ONCE before all test files (not per-fork). If the sensitivity model
 * is unreachable, sets SENSITIVITY_TEST_SKIP=true so veiled-variants skips.
 *
 * Must be a vitest globalSetup (not setupFiles) — setupFiles run per fork,
 * and with 70+ test files the 15s probe timeout would compound to ~18 min.
 */

import { models } from '../../src/constants/model-mappings.js';
import { exampleBudget } from '../../src/constants/common.js';
import { env } from '../../src/lib/env/index.js';

const PROBE_TIMEOUT = 15_000;

async function warmModel(model) {
  const url = `${model.apiUrl}${model.endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.name,
      messages: [{ role: 'user', content: 'hi' }],
      think: false,
      keep_alive: '30m',
      options: { num_ctx: 4096, num_predict: 256 },
    }),
    signal: AbortSignal.timeout(PROBE_TIMEOUT),
  });
  if (!response.ok) throw new Error(`${response.status}`);
}

export async function setup() {
  const provider = (env.VERBLETS_LLM_PROVIDER || '').toLowerCase();
  const keys = [
    env.OPENAI_API_KEY && 'openai',
    env.ANTHROPIC_API_KEY && 'anthropic',
    models.sensitive?.apiUrl && 'ollama',
  ].filter(Boolean);

  let sensitiveSkipped = false;
  if (models.sensitive?.apiUrl) {
    try {
      await warmModel(models.sensitive);
    } catch {
      process.env.SENSITIVITY_TEST_SKIP = 'true';
      sensitiveSkipped = true;
    }
  }

  const lines = [
    `  budget: ${exampleBudget} (low=quick, medium=multi-call, high=all)`,
    `  providers: ${keys.join(', ') || 'none'}${provider ? ` (override: ${provider})` : ''}`,
    sensitiveSkipped && '  sensitivity model: unreachable → veiled-variants skipped',
    !models.sensitive?.apiUrl && '  sensitivity model: not configured → veiled-variants skipped',
  ].filter(Boolean);

  console.log(`\n  Example suite config:\n${lines.join('\n')}\n`);
}
