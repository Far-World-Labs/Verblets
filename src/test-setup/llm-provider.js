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

// ── Provider override ────────────────────────────────────────────────

const providerModels = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
};

const provider = (process.env.VERBLETS_LLM_PROVIDER || '').toLowerCase();

let savedRules;

if (provider && providerModels[provider]) {
  beforeAll(() => {
    savedRules = modelService.rules;
    modelService.setRules([{ use: providerModels[provider] }]);
  });

  afterAll(() => {
    modelService.setRules(savedRules);
  });
}
