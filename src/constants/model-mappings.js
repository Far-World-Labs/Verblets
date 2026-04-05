/**
 * Model Mappings
 *
 * Ordered pattern-matching rules that map capability requests to models.
 * Each rule has an optional `match` (capability conditions) and a `use` (model name).
 * First matching rule wins. Rules without `match` are catch-all defaults.
 *
 * Entries are selected automatically based on available API keys.
 * When OpenWebUI is configured, sensitive-capable rules are prepended.
 */

import { runtime } from '../lib/env/index.js';
import { get as configGet, validate } from '../lib/config/index.js';
import { catalog } from './model-catalog.js';

// ── Gated capabilities ─────────────────────────────────────────────
// If a consumer hard-requires a gated capability (true, not 'prefer'),
// rules that don't mention it in their match are skipped.
// Prevents sensitive data from reaching cloud models, and prevents
// expensive reasoning models from being selected without opt-in.
export const DEFAULT_GATED_CAPABILITIES = new Set(['sensitive', 'reasoning']);

// ── Provider Rules ─────────────────────────────────────────────────
// Order matters: first matching rule wins.

const openaiRules = [
  { match: { reasoning: true }, use: 'gpt-5.2-pro' },
  { match: { cheap: true, good: false }, use: 'gpt-4.1-nano' },
  { use: 'gpt-4.1-mini' },
];

const anthropicRules = [
  { match: { reasoning: true }, use: 'claude-opus-4-6' },
  { match: { cheap: true, good: false }, use: 'claude-haiku-4-5' },
  { use: 'claude-sonnet-4-6' },
];

const mixedRules = [
  { match: { reasoning: true }, use: 'claude-opus-4-6' },
  { match: { cheap: true, good: false }, use: 'gpt-4.1-nano' },
  { use: 'gpt-4.1-mini' },
];

function selectRules() {
  const hasOpenAI = !!configGet('OPENAI_API_KEY');
  const hasAnthropic = !!configGet('ANTHROPIC_API_KEY');
  const hasOpenWebUI = !!configGet('OPENWEBUI_API_KEY');

  let rules;
  if (hasOpenAI && hasAnthropic) {
    rules = [...mixedRules];
  } else if (hasAnthropic) {
    rules = [...anthropicRules];
  } else if (hasOpenAI) {
    rules = [...openaiRules];
  } else {
    // No API keys — fall back to OpenAI rules so model definitions
    // are always populated (needed for unit tests, token budgeting, etc.)
    rules = [...openaiRules];
  }

  if (hasOpenWebUI) {
    // Sensitive rules prepended — they're gated so only match when
    // consumer explicitly requests sensitive capability.
    rules.unshift(
      { match: { sensitive: true, good: true }, use: configGet('VERBLETS_SENSITIVITY_GOOD_MODEL') },
      { match: { sensitive: true }, use: configGet('VERBLETS_SENSITIVITY_MODEL') }
    );
  }

  return rules;
}

export const defaultRules = selectRules();

// ── Environment Validation ──────────────────────────────────────────

function validateEnvironment() {
  const errors = validate();
  for (const error of errors) {
    console.warn(`Warning: ${error}`);
  }

  if (runtime.isBrowser && !!configGet('OPENAI_API_KEY')) {
    console.warn(
      'WARNING: API key detected in browser environment. ' +
        'For security, please use a proxy endpoint instead.'
    );
  }
}

if (configGet('NODE_ENV') !== 'test') {
  validateEnvironment();
}

// ── Catalog resolution ─────────────────────────────────────────────

// Helper: resolve a model name to a catalog entry.
// Uses defineProperties to preserve lazy getters (apiKey, apiUrl) from catalog.
export const resolveCatalogEntry = (modelName) => {
  const entry = catalog[modelName];
  if (!entry) return undefined;
  const descriptors = Object.getOwnPropertyDescriptors(entry);
  return Object.defineProperties({ name: modelName }, descriptors);
};

/** Find the first rule whose match includes the given capability. */
export const findRule = (cap) => defaultRules.find((r) => r.match?.[cap] === true);
