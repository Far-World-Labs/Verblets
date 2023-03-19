import chai from 'chai';

const expect = chai.expect;

const _Model = {
  textDavinci003: 'text-davinci-003',
};

expect(process.env.OPENAI_API_KEY).to.exist;
export const apiKey = process.env.OPENAI_API_KEY;

const secondsInDay = 60 * 60 * 24;
export const cacheTTL = process.env.OPENAI_COMPLETIONS_CACHE_TTL ?? secondsInDay;

export const debugPromptGlobally = process.env.DEBUG_PROMPT ?? false;

export const debugResultGlobally = process.env.DEBUG_RESULT ?? false;

export const defaultModel = _Model.textDavinci003;

export const frequencyPenalty = process.env.OPENAI_COMPLETIONS_FREQUENCY_PENALTY ?? 0;

export const maxTokens = process.env.OPENAI_COMPLETIONS_MAX_TOKENS ?? 250;

export const models = [{
  name: _Model.textDavinci003,
  maxTokens: 4097,
}];

export const Model = _Model;

export const presencePenalty = process.env.OPENAI_COMPLETIONS_PRESENCE_PENALTY ?? 0;

export const temperature = process.env.OPENAI_COMPLETIONS_TEMPERATURE ?? 1;

export const topP = process.env.OPENAI_COMPLETIONS_TOPP ?? 0.5;
