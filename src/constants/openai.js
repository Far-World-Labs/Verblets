import chai from 'chai';

const expect = chai.expect;

const _models = [{
  name: 'text-davinci-003',
  maxTokens: 4097,
}, {
  name: 'gpt-4-32k-0314',
  maxTokens: 32768,
}];

expect(process.env.OPENAI_API_KEY).to.exist;
export const apiKey = process.env.OPENAI_API_KEY;

const secondsInDay = 60 * 60 * 24;
export const cacheTTL = process.env.OPENAI_COMPLETIONS_CACHE_TTL ?? secondsInDay;

export const debugPromptGlobally = process.env.OPENAI_DEBUG_PROMPT ?? false;

export const debugPromptGloballyIfChanged = process.env.OPENAI_DEBUG_PROMPT_IF_CHANGED ?? false;

export const debugResultGlobally = process.env.OPENAI_DEBUG_RESULT ?? false;

export const debugResultGloballyIfChanged = process.env.OPENAI_DEBUG_RESULT_IF_CHANGED ?? false;

export const defaultModel = _models[0].name // text-davinci-003

export const frequencyPenalty = process.env.OPENAI_COMPLETIONS_FREQUENCY_PENALTY ?? 0;

export const maxTokens = process.env.OPENAI_COMPLETIONS_MAX_TOKENS ?? 250;

export const models = _models;

export const presencePenalty = process.env.OPENAI_COMPLETIONS_PRESENCE_PENALTY ?? 0;

export const temperature = process.env.OPENAI_COMPLETIONS_TEMPERATURE ?? 0;

export const topP = process.env.OPENAI_COMPLETIONS_TOPP ?? 0.5;
