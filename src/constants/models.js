/* eslint-disable no-unused-expressions, import/prefer-default-export */

// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chai from 'chai';

const { expect } = chai;

// eslint-disable-next-line no-underscore-dangle
const _models = {};

if (process.env.OPENAI_API_KEY) {
  _models.publicBase = {
    endpoint: 'v1/chat/completions',
    name: 'gpt-4o',
    maxTokens: 16384,
    requestTimeout: 40000,
    apiKey: process.env.OPENAI_API_KEY,
    apiUrl: 'https://api.openai.com/',
  };
}

if (process.env.GPT_REASONING_ENABLED) {
  _models.publicReasoning = {
    endpoint: 'v1/chat/completions',
    name: 'gpt-4.1-2025-04-14',
    maxTokens: 16384,
    requestTimeout: 50000,
    apiKey: process.env.OPENAI_API_KEY,
    apiUrl: 'https://api.openai.com/',
  };
}

if (process.env.OPENWEBUI_API_URL && process.env.OPENWEBUI_API_KEY) {
  _models.privateBase = {
    name: 'cogito:latest',
    endpoint: 'api/chat/completions',
    maxTokens: 4096,
    requestTimeout: 120000,
    apiUrl: process.env.OPENWEBUI_API_URL.endsWith('/')
      ? process.env.OPENWEBUI_API_URL
      : `${process.env.OPENWEBUI_API_URL}/`,
    apiKey: process.env.OPENWEBUI_API_KEY,
    systemPrompt: `You are a helpful AI assistant powered by Llama 3. 
                  You aim to be direct, accurate, and helpful.
                  If you're not sure about something, say so.`,
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
