/* eslint-disable no-unused-expressions, import/prefer-default-export */

// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chai from 'chai';

const { expect } = chai;

// eslint-disable-next-line no-underscore-dangle
const _models = {};

const systemPrompt = `You are a superintelligent processing unit, answering prompts with precise instructions.
You are a small but critical component in a complex system, so your role in giving quality outputs to your given inputs and instructions is critical. 
You must obey those instructions to the letter at all costs--do not deviate or add your own interpretation or flair. Stick to the instructions. 
Aim to be direct, accurate, correct, and concise.
You'll often be given complex inputs alongside your instructions. Consider the inputs carefully and think through your answer in relation to the inputs and instructions.
Most prompts will ask for a specific output format, so comply with those details exactly as well.`;

if (process.env.OPENAI_API_KEY) {
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
    apiKey: process.env.OPENAI_API_KEY,
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
    apiKey: process.env.OPENAI_API_KEY,
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
    apiKey: process.env.OPENAI_API_KEY,
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
    apiKey: process.env.OPENAI_API_KEY,
    apiUrl: 'https://api.openai.com/',
    systemPrompt,
  };

  // Full matrix with explicit names (no aliases)
  _models.fastGoodMulti = _models.fastCheapMulti;
  _models.fastGoodCheapMulti = _models.fastGoodMulti; // Default system model
  _models.fastGoodCheap = _models.fastGoodMulti;
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
}

if (process.env.OPENWEBUI_API_URL && process.env.OPENWEBUI_API_KEY) {
  // cutoff: 03/2024
  // Supports image inputs
  _models.privacy = {
    name: 'gemma3:latest', // same as gemma3:4b
    endpoint: 'api/chat/completions',
    maxContextWindow: 128_000,
    maxOutputTokens: 8_192,
    requestTimeout: 120_000,
    apiUrl: process.env.OPENWEBUI_API_URL.endsWith('/')
      ? process.env.OPENWEBUI_API_URL
      : `${process.env.OPENWEBUI_API_URL}/`,
    apiKey: process.env.OPENWEBUI_API_KEY,
    systemPrompt,
    modelOptions: {
      stop: ['</s>'],
    },
  };
}

// Allow tests to run without requiring an API key
if (process.env.NODE_ENV !== 'test') {
  expect(process.env.OPENAI_API_KEY).to.exist;
}

const secondsInDay = 60 * 60 * 24;
export const cacheTTL = process.env.CHATGPT_CACHE_TTL ?? secondsInDay;

export const debugPromptGlobally = process.env.CHATGPT_DEBUG_REQUEST ?? false;

export const debugPromptGloballyIfChanged = process.env.CHATGPT_DEBUG_REQUEST_IF_CHANGED ?? false;

export const debugResultGlobally = process.env.CHATGPT_DEBUG_RESPONSE ?? false;

export const debugResultGloballyIfChanged = process.env.CHATGPT_DEBUG_RESPONSE_IF_CHANGED ?? false;

export const frequencyPenalty = process.env.CHATGPT_FREQUENCY_PENALTY ?? 0;

export const models = _models;

export const operationTimeoutMultiplier = 2;

export const presencePenalty = process.env.CHATGPT_PRESENCE_PENALTY ?? 0;

export const temperature = process.env.CHATGPT_TEMPERATURE ?? 0;

export const topP = process.env.CHATGPT_TOPP ?? 0.5;
