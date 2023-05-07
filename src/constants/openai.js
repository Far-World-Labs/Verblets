/* eslint-disable no-unused-expressions, import/prefer-default-export */

// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chai from 'chai';

const { expect } = chai;

// eslint-disable-next-line no-underscore-dangle
const _models = {
  gpt35Turbo: {
    endpoint: 'v1/chat/completions',
    name: 'gpt-3.5-turbo',
    maxTokens: 4097,
    requestTimeout: 30000,
  },
  textDavinci003: {
    endpoint: 'v1/completions',
    name: 'text-davinci-003',
    maxTokens: 4097,
    requestTimeout: 15000,
  },
};

if (process.env.CHATGPT_V4_ENABLED) {
  _models.gpt4 = {
    endpoint: 'v1/chat/completions',
    name: 'gpt-4',
    maxTokens: 8192,
    requestTimeout: 50000,
  };
}

expect(process.env.OPENAI_API_KEY).to.exist;

export const apiKey = process.env.OPENAI_API_KEY;

const secondsInDay = 60 * 60 * 24;
export const cacheTTL = process.env.CHATGPT_CACHE_TTL ?? secondsInDay;

export const debugPromptGlobally = process.env.CHATGPT_DEBUG_REQUEST ?? false;

export const debugPromptGloballyIfChanged =
  process.env.CHATGPT_DEBUG_REQUEST_IF_CHANGED ?? false;

export const debugResultGlobally = process.env.CHATGPT_DEBUG_RESPONSE ?? false;

export const debugResultGloballyIfChanged =
  process.env.CHATGPT_DEBUG_RESPONSE_IF_CHANGED ?? false;

export const frequencyPenalty = process.env.CHATGPT_FREQUENCY_PENALTY ?? 0;

export const models = _models;

export const operationTimeoutMultiplier = 2;

export const presencePenalty = process.env.CHATGPT_PRESENCE_PENALTY ?? 0;

export const temperature = process.env.CHATGPT_TEMPERATURE ?? 0;

export const topP = process.env.CHATGPT_TOPP ?? 0.5;
