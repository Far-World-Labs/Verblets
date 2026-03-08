/**
 * Model Configuration for LLM Services
 *
 * Three layers:
 *   1. catalog    – every known model, keyed by its real API name
 *   2. mapping    – capability aliases (fastGood, reasoning, …) → catalog key
 *   3. _models    – runtime model definitions consumed by llm-model service
 */

import { env, runtime } from '../lib/env/index.js';
import { assertValidModelDef } from './model-validation.js';

// ── Shared ──────────────────────────────────────────────────────────

const systemPrompt = `You are a superintelligent processing unit, answering prompts with precise instructions.
You are a small but critical component in a complex system, so your role in giving quality outputs to your given inputs and instructions is critical.
You must obey those instructions to the letter at all costs--do not deviate or add your own interpretation or flair. Stick to the instructions.
Aim to be direct, accurate, correct, and concise.
You'll often be given complex inputs alongside your instructions. Consider the inputs carefully and think through your answer in relation to the inputs and instructions.
Most prompts will ask for a specific output format, so comply with those details exactly as well.`;

// ── Model Catalog ───────────────────────────────────────────────────
// Every model the library knows about, keyed by the provider-specific name.

export const catalog = {
  // ── OpenAI (Chat Completions) ──────────────────────────────────────
  'gpt-4.1': {
    provider: 'openai',
    endpoint: 'v1/chat/completions',
    maxContextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    requestTimeout: 45_000,
    get apiKey() {
      return env.OPENAI_API_KEY;
    },
    get apiUrl() {
      return env.OPENAI_PROXY_URL || 'https://api.openai.com/';
    },
    systemPrompt,
  },
  'gpt-4.1-mini': {
    provider: 'openai',
    endpoint: 'v1/chat/completions',
    maxContextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    requestTimeout: 45_000,
    get apiKey() {
      return env.OPENAI_API_KEY;
    },
    get apiUrl() {
      return env.OPENAI_PROXY_URL || 'https://api.openai.com/';
    },
    systemPrompt,
  },
  'gpt-4.1-nano': {
    provider: 'openai',
    endpoint: 'v1/chat/completions',
    maxContextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    requestTimeout: 30_000,
    get apiKey() {
      return env.OPENAI_API_KEY;
    },
    get apiUrl() {
      return env.OPENAI_PROXY_URL || 'https://api.openai.com/';
    },
    systemPrompt,
  },
  // ── OpenAI (Responses API) ─────────────────────────────────────────
  'gpt-5.2-pro': {
    provider: 'openai-responses',
    endpoint: 'v1/responses',
    maxContextWindow: 400_000,
    maxOutputTokens: 128_000,
    requestTimeout: 120_000,
    get apiKey() {
      return env.OPENAI_API_KEY;
    },
    get apiUrl() {
      return env.OPENAI_PROXY_URL || 'https://api.openai.com/';
    },
    systemPrompt,
  },
  // ── Anthropic ──────────────────────────────────────────────────────
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    endpoint: 'v1/messages',
    maxContextWindow: 200_000,
    maxOutputTokens: 64_000,
    requestTimeout: 90_000,
    get apiKey() {
      return env.ANTHROPIC_API_KEY;
    },
    get apiUrl() {
      return 'https://api.anthropic.com/';
    },
    systemPrompt,
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    endpoint: 'v1/messages',
    maxContextWindow: 200_000,
    maxOutputTokens: 64_000,
    requestTimeout: 45_000,
    get apiKey() {
      return env.ANTHROPIC_API_KEY;
    },
    get apiUrl() {
      return 'https://api.anthropic.com/';
    },
    systemPrompt,
  },
  'claude-opus-4-6': {
    provider: 'anthropic',
    endpoint: 'v1/messages',
    maxContextWindow: 200_000,
    maxOutputTokens: 128_000,
    requestTimeout: 120_000,
    get apiKey() {
      return env.ANTHROPIC_API_KEY;
    },
    get apiUrl() {
      return 'https://api.anthropic.com/';
    },
    systemPrompt,
  },
  // ── Local / Privacy ────────────────────────────────────────────────
  'gemma3:12b-it-qat': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 128_000,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    get apiUrl() {
      const url = env.OPENWEBUI_API_URL ?? '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return env.OPENWEBUI_API_KEY;
    },
    systemPrompt,
    modelOptions: {},
  },
  'gemma3:4b-it-qat': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 128_000,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    get apiUrl() {
      const url = env.OPENWEBUI_API_URL ?? '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return env.OPENWEBUI_API_KEY;
    },
    systemPrompt,
    modelOptions: {},
  },
  'qwen3:8b': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 32_768,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    get apiUrl() {
      const url = env.OPENWEBUI_API_URL ?? '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return env.OPENWEBUI_API_KEY;
    },
    systemPrompt,
    modelOptions: {},
  },
};

// ── Capability Mappings ──────────────────────────────────────────────
// Three modes selected automatically based on which API keys are present.
// Override via .verblets.json or window.verblets.models (browser).

const openaiMapping = {
  fastGood: 'gpt-4.1-mini',
  fastCheap: 'gpt-4.1-nano',
  reasoning: 'gpt-5.2-pro',
};

const anthropicMapping = {
  fastGood: 'claude-sonnet-4-5',
  fastCheap: 'claude-haiku-4-5',
  reasoning: 'claude-opus-4-6',
};

const mixedMapping = {
  fastGood: 'gpt-4.1-mini',
  fastCheap: 'gpt-4.1-nano',
  reasoning: 'claude-opus-4-6',
};

function selectMapping() {
  const hasOpenAI = !!env.OPENAI_API_KEY;
  const hasAnthropic = !!env.ANTHROPIC_API_KEY;
  const hasOpenWebUI = !!env.OPENWEBUI_API_KEY;

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
    mapping.privacy = env.VERBLETS_PRIVACY_MODEL || 'qwen3:8b';
  }

  return mapping;
}

export const defaultMapping = selectMapping();

// ── Environment Validation ──────────────────────────────────────────

function validateEnvironment() {
  const hasOpenAI = !!env.OPENAI_API_KEY;
  const hasAnthropic = !!env.ANTHROPIC_API_KEY;

  if (!hasOpenAI && !hasAnthropic && env.NODE_ENV !== 'test') {
    console.warn('Warning: No LLM API keys found (OPENAI_API_KEY or ANTHROPIC_API_KEY).');
    console.warn('At least one provider key is required for model configurations to work.');
  }

  if (runtime.isBrowser && hasOpenAI) {
    console.warn(
      'WARNING: API key detected in browser environment. ' +
        'For security, please use a proxy endpoint instead.'
    );
  }
}

if (env.NODE_ENV !== 'test') {
  validateEnvironment();
}

// ── Build _models from catalog + mapping ────────────────────────────
// The _models object provides the capability-keyed entries that
// llm-model/index.js wraps in Model instances.

const _models = {};

// Helper: resolve a mapping value to a catalog entry
const resolveCatalogEntry = (modelName) => {
  const entry = catalog[modelName];
  if (!entry) return undefined;
  return { name: modelName, ...entry };
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

// Validate all model definitions
Object.entries(_models).forEach(([key, model]) => {
  if (model) assertValidModelDef(key, model);
});

// ── Exported Config Constants ───────────────────────────────────────
// Env vars renamed from CHATGPT_* → VERBLETS_* (old names still honoured)

const secondsInDay = 60 * 60 * 24;
const secondsInYear = secondsInDay * 365;
export const cacheTTL = env.VERBLETS_CACHE_TTL ?? env.CHATGPT_CACHE_TTL ?? secondsInYear;

export const cachingEnabled = env.DISABLE_CACHE !== 'true';

export const debugPromptGlobally = env.VERBLETS_DEBUG_PROMPT ?? env.CHATGPT_DEBUG_PROMPT ?? false;

export const debugPromptGloballyIfChanged =
  env.VERBLETS_DEBUG_REQUEST_IF_CHANGED ?? env.CHATGPT_DEBUG_REQUEST_IF_CHANGED ?? false;

export const debugResultGlobally =
  env.VERBLETS_DEBUG_RESPONSE ?? env.CHATGPT_DEBUG_RESPONSE ?? false;

export const debugResultGloballyIfChanged =
  env.VERBLETS_DEBUG_RESPONSE_IF_CHANGED ?? env.CHATGPT_DEBUG_RESPONSE_IF_CHANGED ?? false;

export const frequencyPenalty =
  env.VERBLETS_FREQUENCY_PENALTY ?? env.CHATGPT_FREQUENCY_PENALTY ?? 0;

export const presencePenalty = env.VERBLETS_PRESENCE_PENALTY ?? env.CHATGPT_PRESENCE_PENALTY ?? 0;

export const temperature = env.VERBLETS_TEMPERATURE ?? env.CHATGPT_TEMPERATURE ?? 0;

export const topP = env.VERBLETS_TOPP ?? env.CHATGPT_TOPP ?? 0.5;

export const models = _models;
