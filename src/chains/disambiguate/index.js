import chatGPT from '../../lib/chatgpt/index.js';
import listFilter from '../../verblets/list-filter/index.js';
import toObject from '../../verblets/to-object/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const schema = require('./schema.json');

const { onlyJSONStringArray } = promptConstants;

const meaningsPrompt = (term) => {
  return `${onlyJSONStringArray}
List all distinct dictionary meanings or common uses of "${term}".
${onlyJSONStringArray}`;
};

export const getMeanings = async (term, { model = modelService.getBestPublicModel() } = {}) => {
  const prompt = meaningsPrompt(term);
  const budget = model.budgetTokens(prompt);
  const response = await chatGPT(prompt, {
    maxTokens: budget.completion,
    modelOptions: { response_format: { type: 'json_object', schema } },
  });
  return toObject(response);
};

export default async function disambiguate({
  term,
  context,
  model = modelService.getBestPublicModel(),
} = {}) {
  const meanings = await getMeanings(term, { model });
  const best = await listFilter(
    meanings,
    `the meaning of "${term}" in context: ${context}. Keep only the single best matching meaning.`
  );
  return { meaning: best[0], meanings };
}
