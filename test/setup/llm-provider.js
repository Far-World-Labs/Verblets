/* global process, URL */
/**
 * LLM Provider override for example tests.
 *
 * Set VERBLETS_LLM_PROVIDER to force a specific provider for all example tests:
 *   - "openai"     → gpt-4.1-mini
 *   - "anthropic"  → claude-sonnet-4-5
 *   - unset / ""   → default (auto-detected from available API keys)
 *
 * Usage:
 *   VERBLETS_LLM_PROVIDER=anthropic npm run examples
 *   VERBLETS_LLM_PROVIDER=openai npx vitest run --config vitest.config.examples.js
 */

import { afterAll, beforeAll } from 'vitest';
import modelService from '../../src/services/llm-model/index.js';
import { models } from '../../src/constants/model-mappings.js';

// ── Provider override ────────────────────────────────────────────────

const providerModels = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
};

const provider = (process.env.VERBLETS_LLM_PROVIDER || '').toLowerCase();

if (provider && providerModels[provider]) {
  beforeAll(() => {
    modelService.setGlobalOverride('modelName', providerModels[provider]);
  });

  afterAll(() => {
    modelService.clearGlobalOverride('modelName');
  });
}

// ── OpenWebUI model warm-up ──────────────────────────────────────────
// Ollama models may need to load from disk (cold-start). Send a minimal
// completion to warm up each model before tests run. If the model fails
// to respond, set SENSITIVITY_TEST_SKIP so example tests skip gracefully.

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
    signal: AbortSignal.timeout(model.requestTimeout || 240_000),
  });
  if (!response.ok) throw new Error(`${response.status}`);
}

if (models.sensitive?.apiUrl) {
  try {
    await warmModel(models.sensitive);
  } catch {
    process.env.SENSITIVITY_TEST_SKIP = 'true';
  }
}
