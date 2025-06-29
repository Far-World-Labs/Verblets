/**
 * Model Configuration for LLM Services
 *
 * This module defines model configurations for various LLM providers including
 * OpenAI, Anthropic, and other services. It handles environment variable
 * validation and provides sensible defaults for different use cases.
 */

// Validate critical environment variables
function validateEnvironment() {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter((key) => !process.env[key] && process.env.NODE_ENV !== 'test');

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some model configurations may not work properly.');
  }
}

// Validate environment on module load (except in tests)
if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
}

/**
 * Base model configurations organized by provider and capability
 */

// OpenAI GPT Models - Primary LLM provider
export const gpt4o = 'gpt-4o';
export const gpt4oMini = 'gpt-4o-mini';
export const gpt4Turbo = 'gpt-4-turbo';
export const gpt35Turbo = 'gpt-3.5-turbo';

// Anthropic Claude Models - Alternative provider for specific use cases
export const claude35Sonnet = 'claude-3-5-sonnet-20241022';
export const claude3Haiku = 'claude-3-haiku-20240307';

// Specialized Models
export const o1Preview = 'o1-preview'; // Advanced reasoning
export const o1Mini = 'o1-mini'; // Lightweight reasoning

/**
 * Capability-based model aliases for consistent usage patterns
 * These provide semantic meaning to model selection
 */

// Performance tiers
export const fast = gpt4oMini; // Quick responses, lower cost
export const good = gpt4o; // Balanced performance/cost
export const smart = gpt4Turbo; // High capability tasks
export const cheap = gpt4oMini; // Cost-optimized

// Combined capability aliases
export const fastGood = gpt4o; // Fast + Good quality
export const fastGoodCheap = gpt4oMini; // Optimized for all three
export const goodCheap = gpt4o; // Quality + Cost balance
export const smartExpensive = o1Preview; // Maximum capability

// Legacy and compatibility aliases
export const chatgpt = gpt4o; // Default ChatGPT model
export const default4o = gpt4o; // Explicit 4o reference

// Provider-specific aliases for consistency
export const openai = {
  gpt4o,
  gpt4oMini,
  gpt4Turbo,
  gpt35Turbo,
  o1Preview,
  o1Mini,
};

export const anthropic = {
  claude35Sonnet,
  claude3Haiku,
};

/**
 * Model selection utilities
 */

// Get model for specific use case
export function getModelForUseCase(useCase) {
  const useCaseMap = {
    fast,
    quality: good,
    reasoning: smart,
    cost: cheap,
    balanced: fastGood,
    default: good,
  };

  return useCaseMap[useCase] || good;
}

// Validate model availability
export function isModelAvailable(model) {
  const availableModels = [
    gpt4o,
    gpt4oMini,
    gpt4Turbo,
    gpt35Turbo,
    claude35Sonnet,
    claude3Haiku,
    o1Preview,
    o1Mini,
  ];

  return availableModels.includes(model);
}

const _models = {};

// Function to get API key at runtime
const getOpenAIKey = () => process.env.OPENAI_API_KEY;

const systemPrompt = `You are a superintelligent processing unit, answering prompts with precise instructions.
You are a small but critical component in a complex system, so your role in giving quality outputs to your given inputs and instructions is critical. 
You must obey those instructions to the letter at all costs--do not deviate or add your own interpretation or flair. Stick to the instructions. 
Aim to be direct, accurate, correct, and concise.
You'll often be given complex inputs alongside your instructions. Consider the inputs carefully and think through your answer in relation to the inputs and instructions.
Most prompts will ask for a specific output format, so comply with those details exactly as well.`;

// // $0.10-0.40/1M tokens
// // cutoff: 5/2024
// // supports image inputs, very high speed, 1M token context, 32K output
// // low intelligence, but > 3.5 turbo
// _models.fastCheapMulti = {
//   endpoint: 'v1/chat/completions',
//   name: 'gpt-4.1-nano-2025-04-14',
//   maxContextWindow: 1_047_576,
//   maxOutputTokens: 32_768,
//   requestTimeout: 20_000,
//   apiKey: process.env.OPENAI_API_KEY,
//   apiUrl: 'https://api.openai.com/',
//   systemPrompt,
// };

// // $.40-$1.60/1M tokens
// // cutoff: 05/2024
// // supports image inputs, high speed, 1M token context, 32K output
// _models.fastGoodMulti = {
//   endpoint: 'v1/chat/completions',
//   name: 'gpt-4.1-mini-2025-04-14',
//   maxContextWindow: 1_047_576,
//   maxOutputTokens: 32_768,
//   requestTimeout: 20_000,
//   apiKey: process.env.OPENAI_API_KEY,
//   apiUrl: 'https://api.openai.com/',
//   systemPrompt,
// };
_models.fastCheapMulti = {
  endpoint: 'v1/chat/completions',
  name: 'gpt-4o',
  maxContextWindow: 128_000,
  maxOutputTokens: 16_384,
  requestTimeout: 20_000,
  get apiKey() {
    return getOpenAIKey();
  },
  apiUrl: 'https://api.openai.com/',
  systemPrompt,
};

// $2.5-$10.00/1M tokens
// cutoff: 09/2023
// supports image inputs, moderate speed
_models.goodMulti = {
  endpoint: 'v1/chat/completions',
  name: 'gpt-4o-2024-11-20',
  maxContextWindow: 128_000,
  maxOutputTokens: 16_384,
  requestTimeout: 20_000,
  get apiKey() {
    return getOpenAIKey();
  },
  apiUrl: 'https://api.openai.com/',
  systemPrompt,
};

// Caution!: $1.1-4.4/1M tokens
// cutoff: 05/2024
// supports image inputs, moderate speed
_models.fastCheapReasoningMulti = {
  endpoint: 'v1/chat/completions',
  name: 'o4-mini-2025-04-16',
  maxContextWindow: 128_000,
  maxOutputTokens: 16_384,
  requestTimeout: 40_000,
  get apiKey() {
    return getOpenAIKey();
  },
  apiUrl: 'https://api.openai.com/',
  systemPrompt,
};

// Caution!: $10-40/1M tokens
// cutoff: 05/2024
// supports image inputs
_models.reasoningNoImage = {
  endpoint: 'v1/chat/completions',
  name: 'o3-2025-04-16',
  maxContextWindow: 200_000,
  maxOutputTokens: 100_000,
  requestTimeout: 120_000,
  get apiKey() {
    return getOpenAIKey();
  },
  apiUrl: 'https://api.openai.com/',
  systemPrompt,
};

// Full matrix with explicit names (no aliases)
_models.fastGoodMulti = _models.fastCheapMulti;
_models.fastGoodCheapMulti = _models.fastGoodMulti; // Default system model
_models.fastGoodCheap = _models.fastGoodMulti;
_models.fastGoodCheapCoding = _models.fastGoodMulti; // Coding-optimized model
_models.fastMulti = _models.fastGoodMulti;
_models.fast = _models.fastGoodMulti;
_models.fastGood = _models.fastGoodMulti;
_models.fastReasoningMulti = _models.fastCheapReasoningMulti;
_models.fastReasoning = _models.fastCheapReasoningMulti;

// eslint-disable-next-line no-self-assign
_models.fastCheapMulti = _models.fastCheapMulti;
_models.fastCheap = _models.fastCheapMulti;
_models.fastCheapReasoning = _models.fastCheapReasoningMulti;

_models.cheapMulti = _models.fastCheapMulti;
_models.cheap = _models.fastCheapMulti;
_models.cheapGoodMulti = _models.fastGoodMulti;
_models.cheapGood = _models.fastGoodMulti;
_models.cheapReasoningMulti = _models.fastCheapReasoningMulti;
_models.cheapReasoning = _models.fastCheapReasoningMulti;

// eslint-disable-next-line no-self-assign
_models.goodMulti = _models.goodMulti; // Caution: Moderate cost
_models.good = _models.goodMulti; // Caution: Moderate cost

_models.reasoningMulti = _models.fastCheapReasoningMulti; // Caution: Moderate cost
_models.reasoning = _models.reasoningNoImage; // Caution: High cost

// cutoff: 03/2024
// Supports image inputs
_models.privacy = {
  name: 'gemma3:latest', // same as gemma3:4b
  endpoint: 'api/chat/completions',
  maxContextWindow: 128_000,
  maxOutputTokens: 8_192,
  requestTimeout: 120_000,
  apiUrl: (process.env.OPENWEBUI_API_URL ?? '').endsWith('/')
    ? process.env.OPENWEBUI_API_URL
    : `${process.env.OPENWEBUI_API_URL}/`,
  get apiKey() {
    return process.env.OPENWEBUI_API_KEY;
  },
  systemPrompt,
  modelOptions: {
    stop: ['</s>'],
  },
};

// Allow tests to run without requiring an API key
if (process.env.NODE_ENV !== 'test') {
  // expect(process.env.OPENAI_API_KEY).to.exist;
}

const secondsInDay = 60 * 60 * 24;
const secondsInYear = secondsInDay * 365; // 365 days
export const cacheTTL = process.env.CHATGPT_CACHE_TTL ?? secondsInYear;

// Caching can be disabled by setting DISABLE_CACHE=true
// By default, caching is enabled when Redis is available and working
export const cachingEnabled = process.env.DISABLE_CACHE !== 'true';

export const debugPromptGlobally = process.env.CHATGPT_DEBUG_PROMPT ?? false;

export const debugPromptGloballyIfChanged = process.env.CHATGPT_DEBUG_REQUEST_IF_CHANGED ?? false;

export const debugResultGlobally = process.env.CHATGPT_DEBUG_RESPONSE ?? false;

export const debugResultGloballyIfChanged = process.env.CHATGPT_DEBUG_RESPONSE_IF_CHANGED ?? false;

export const frequencyPenalty = process.env.CHATGPT_FREQUENCY_PENALTY ?? 0;

export const models = _models;

export const operationTimeoutMultiplier = 2;

export const presencePenalty = process.env.CHATGPT_PRESENCE_PENALTY ?? 0;

export const temperature = process.env.CHATGPT_TEMPERATURE ?? 0;

export const topP = process.env.CHATGPT_TOPP ?? 0.5;
