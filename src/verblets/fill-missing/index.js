import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import fillMissingSchema from './fill-missing-result.json';

const { tryCompleteData, contentIsMain, asJSON } = promptConstants;

function createModelOptions(llm = 'fastGoodCheap') {
  const schema = fillMissingSchema;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'fill_missing_result',
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  }
  return {
    ...llm,
    response_format: responseFormat,
  };
}

export const buildPrompt = (text) =>
  `${tryCompleteData} ${contentIsMain} ${asXML(text, { tag: 'input' })}\n\n` +
  `Return JSON with "template" and "variables" where each variable has "original", ` +
  `"candidate", and "confidence". ${asJSON}`;

export default async function fillMissing(text, config = {}) {
  const { llm, ...options } = config;
  const prompt = buildPrompt(text);
  const modelOptions = createModelOptions(llm);
  const response = await chatGPT(prompt, { modelOptions, ...options });
  return response;
}
