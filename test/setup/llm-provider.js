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

import { lookup } from 'node:dns/promises';
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

// ── Privacy model probe ──────────────────────────────────────────────
// Skip privacy-dependent tests when the OpenWebUI server is unreachable.
// Tests use `it.skipIf(process.env.PRIVACY_TEST_SKIP || !models.privacy)`.

if (models.privacy?.apiUrl) {
  try {
    const { hostname } = new URL(models.privacy.apiUrl);
    await lookup(hostname);
  } catch {
    process.env.PRIVACY_TEST_SKIP = 'true';
  }
}
