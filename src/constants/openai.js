/* eslint-disable no-unused-expressions */

// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chai from 'chai';

const { expect } = chai;

// eslint-disable-next-line no-underscore-dangle
const _models = [
  {
    name: 'text-davinci-003',
    maxTokens: 4097,
  },
  {
    name: 'gpt-4-32k-0314',
    maxTokens: 32768,
  },
];

expect(process.env.OPENAI_API_KEY).to.exist;

export const apiKey = process.env.OPENAI_API_KEY;

const secondsInDay = 60 * 60 * 24;
export const cacheTTL = process.env.CHATGPT_CACHE_TTL ?? secondsInDay;

export const debugPromptGlobally = process.env.OPENAI_DEBUG_PROMPT ?? false;

export const debugPromptGloballyIfChanged =
  process.env.OPENAI_DEBUG_PROMPT_IF_CHANGED ?? false;

export const debugResultGlobally = process.env.OPENAI_DEBUG_RESULT ?? false;

export const debugResultGloballyIfChanged =
  process.env.OPENAI_DEBUG_RESULT_IF_CHANGED ?? false;

export const defaultModel = _models[0]; // text-davinci-003

export const frequencyPenalty = process.env.CHATGPT_FREQUENCY_PENALTY ?? 0;

export const maxTokens = process.env.CHATGPT_MAX_TOKENS ?? 250;

export const models = _models;

export const presencePenalty = process.env.CHATGPT_PRESENCE_PENALTY ?? 0;

export const temperature = process.env.CHATGPT_TEMPERATURE ?? 0;

export const topP = process.env.CHATGPT_TOPP ?? 0.5;

export const requestTimeout = process.env.OPENAI_REQUEST_TIMEOUT ?? 15000;
