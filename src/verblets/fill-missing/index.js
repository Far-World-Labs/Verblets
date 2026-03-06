import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import fillMissingSchema from './fill-missing-result.json';

const { tryCompleteData, contentIsMain, asJSON } = promptConstants;

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'fill_missing_result',
    schema: fillMissingSchema,
  },
};

export const buildPrompt = (text) =>
  `${tryCompleteData} ${contentIsMain} ${asXML(text, { tag: 'input' })}\n\n` +
  `Return JSON with "template" and "variables" where each variable has "original", ` +
  `"candidate", and "confidence". ${asJSON}`;

export default async function fillMissing(text, config = {}) {
  const { llm, ...options } = config;
  const prompt = buildPrompt(text);
  const response = await callLlm(prompt, {
    llm,
    modelOptions: { response_format: responseFormat },
    ...options,
  });
  return response;
}
