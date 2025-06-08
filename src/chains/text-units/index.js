import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import modelService from '../../services/llm-model/index.js';
import toObject from '../../verblets/to-object/index.js';

const { onlyJSONObjectArray, contentIsDetails } = promptConstants;

const unitsPrompt = (text) => `
${onlyJSONObjectArray}
Identify all visible units of the text such as sentences, paragraphs, sections or chapters. For each unit return an object { "type": "<unit name>", "start": <start index>, "end": <end index> }. Character offsets refer to the original text. Include nested or overlapping ranges if they exist.
${contentIsDetails} ${wrapVariable(text)}
${onlyJSONObjectArray}`;

export default async (text, options = {}) => {
  const { model = modelService.getBestPublicModel() } = options;
  const prompt = unitsPrompt(text);
  const budget = model.budgetTokens(prompt);
  const response = await chatGPT(prompt, { maxTokens: budget.completion, ...options });
  return toObject(response);
};
