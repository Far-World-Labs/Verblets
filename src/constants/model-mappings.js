/**
 * Model Mappings
 *
 * Runtime model selection: mapping tables, capability matrix, model builder.
 * Selects which catalog entries to use based on available API keys.
 */

import { runtime } from '../lib/env/index.js';
import { get as configGet, validate } from '../lib/config/index.js';
import { catalog } from './model-catalog.js';
import { assertValidModelDef } from './model-validation.js';

// ── Capability Mappings ──────────────────────────────────────────────
// Three modes selected automatically based on which API keys are present.
// Override via .verblets.json or window.verblets.models (browser).

const openaiMapping = {
  fastGood: 'gpt-4.1-mini',
  fastCheap: 'gpt-4.1-nano',
  reasoning: 'gpt-5.2-pro',
};

const anthropicMapping = {
  fastGood: 'claude-sonnet-4-6',
  fastCheap: 'claude-haiku-4-5',
  reasoning: 'claude-opus-4-6',
};

const mixedMapping = {
  fastGood: 'gpt-4.1-mini',
  fastCheap: 'gpt-4.1-nano',
  reasoning: 'claude-opus-4-6',
};

function selectMapping() {
  const hasOpenAI = !!configGet('OPENAI_API_KEY');
  const hasAnthropic = !!configGet('ANTHROPIC_API_KEY');
  const hasOpenWebUI = !!configGet('OPENWEBUI_API_KEY');

  let mapping = {};
  if (hasOpenAI && hasAnthropic) {
    mapping = { ...mixedMapping };
  } else if (hasAnthropic) {
    mapping = { ...anthropicMapping };
  } else if (hasOpenAI) {
    mapping = { ...openaiMapping };
  } else {
    // No API keys — fall back to OpenAI mapping so model definitions
    // are always populated (needed for unit tests, token budgeting, etc.)
    mapping = { ...openaiMapping };
  }

  if (hasOpenWebUI) {
    mapping.sensitive = configGet('VERBLETS_SENSITIVITY_MODEL');
    mapping.sensitiveGood = configGet('VERBLETS_SENSITIVITY_GOOD_MODEL');
  }

  return mapping;
}

export const defaultMapping = selectMapping();

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

// ── Build _models from catalog + mapping ────────────────────────────
// The _models object provides the capability-keyed entries that
// llm-model/index.js wraps in Model instances.

const _models = {};

// Helper: resolve a mapping value to a catalog entry.
// Uses defineProperties to preserve lazy getters (apiKey, apiUrl) from catalog.
const resolveCatalogEntry = (modelName) => {
  const entry = catalog[modelName];
  if (!entry) return undefined;
  const descriptors = Object.getOwnPropertyDescriptors(entry);
  const result = Object.defineProperties({ name: modelName }, descriptors);
  return result;
};

// Populate from defaultMapping
Object.entries(defaultMapping).forEach(([capability, modelName]) => {
  const entry = resolveCatalogEntry(modelName);
  if (entry) {
    _models[capability] = entry;
  }
});

// Build full capability matrix (aliases pointing to base capabilities)
_models.fastGoodMulti = _models.fastGood;
_models.fastGoodCheap = _models.fastGood;
_models.fastGoodCheapMulti = _models.fastGood;
_models.fastGoodCheapCoding = _models.fastGood;
_models.fastMulti = _models.fastGood;
_models.fast = _models.fastGood;

_models.fastCheapMulti = _models.fastCheap;
_models.cheapMulti = _models.fastCheap;
_models.cheap = _models.fastCheap;
_models.cheapGoodMulti = _models.fastGood;
_models.cheapGood = _models.fastGood;
_models.goodMulti = _models.fastGood;
_models.good = _models.fastGood;

_models.fastCheapReasoning = _models.reasoning;
_models.fastCheapReasoningMulti = _models.reasoning;
_models.fastReasoning = _models.reasoning;
_models.fastReasoningMulti = _models.reasoning;
_models.cheapReasoning = _models.reasoning;
_models.cheapReasoningMulti = _models.reasoning;
_models.reasoningMulti = _models.reasoning;
_models.reasoningNoImage = _models.reasoning;

_models.sensitiveFast = _models.sensitive;

// Validate all model definitions
Object.entries(_models).forEach(([key, model]) => {
  if (model) assertValidModelDef(key, model);
});

export const models = _models;
