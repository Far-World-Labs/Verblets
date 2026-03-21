/**
 * Model Catalog
 *
 * Pure data: every model the library knows about, keyed by provider-specific name.
 * All env reads go through configGet for consistent force-override support.
 */

import { get as configGet } from '../lib/config/index.js';

export const systemPrompt = `You are a superintelligent processing unit, answering prompts with precise instructions.
You are a small but critical component in a complex system, so your role in giving quality outputs to your given inputs and instructions is critical.
You must obey those instructions to the letter at all costs--do not deviate or add your own interpretation or flair. Stick to the instructions.
Aim to be direct, accurate, correct, and concise.
You'll often be given complex inputs alongside your instructions. Consider the inputs carefully and think through your answer in relation to the inputs and instructions.
Most prompts will ask for a specific output format, so comply with those details exactly as well.`;

export const catalog = {
  // ── OpenAI (Chat Completions) ──────────────────────────────────────
  'gpt-4.1': {
    provider: 'openai',
    endpoint: 'v1/chat/completions',
    maxContextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    requestTimeout: 45_000,
    get apiKey() {
      return configGet('OPENAI_API_KEY');
    },
    get apiUrl() {
      return configGet('OPENAI_PROXY_URL');
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
      return configGet('OPENAI_API_KEY');
    },
    get apiUrl() {
      return configGet('OPENAI_PROXY_URL');
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
      return configGet('OPENAI_API_KEY');
    },
    get apiUrl() {
      return configGet('OPENAI_PROXY_URL');
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
      return configGet('OPENAI_API_KEY');
    },
    get apiUrl() {
      return configGet('OPENAI_PROXY_URL');
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
      return configGet('ANTHROPIC_API_KEY');
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
      return configGet('ANTHROPIC_API_KEY');
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
      return configGet('ANTHROPIC_API_KEY');
    },
    get apiUrl() {
      return 'https://api.anthropic.com/';
    },
    systemPrompt,
  },
  // ── Local / Sensitive ──────────────────────────────────────────────
  'gemma3:12b-it-qat': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 128_000,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    structuredOutput: false,
    get apiUrl() {
      const url = configGet('OPENWEBUI_API_URL') || '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return configGet('OPENWEBUI_API_KEY');
    },
    systemPrompt,
  },
  'gemma3:4b-it-qat': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 128_000,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    structuredOutput: false,
    get apiUrl() {
      const url = configGet('OPENWEBUI_API_URL') || '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return configGet('OPENWEBUI_API_KEY');
    },
    systemPrompt,
  },
  'qwen3:8b': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 32_768,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    structuredOutput: false,
    get apiUrl() {
      const url = configGet('OPENWEBUI_API_URL') || '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return configGet('OPENWEBUI_API_KEY');
    },
    systemPrompt,
  },
  'qwen3.5:4b': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 32_768,
    maxOutputTokens: 8_192,
    requestTimeout: 480_000,
    structuredOutput: false,
    get apiUrl() {
      const url = configGet('OPENWEBUI_API_URL') || '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return configGet('OPENWEBUI_API_KEY');
    },
    systemPrompt,
  },
  'qwen3.5:2b': {
    provider: 'openwebui',
    endpoint: 'api/chat/completions',
    maxContextWindow: 32_768,
    maxOutputTokens: 8_192,
    requestTimeout: 240_000,
    structuredOutput: false,
    get apiUrl() {
      const url = configGet('OPENWEBUI_API_URL') || '';
      return url.endsWith('/') ? url : `${url}/`;
    },
    get apiKey() {
      return configGet('OPENWEBUI_API_KEY');
    },
    systemPrompt,
  },
};
