import chatGPT from '../../lib/openai/completions.js';
import { asBool } from '../../prompts/fragment-texts/index.js';
import { toBool, stripResponse } from '../../response-parsers/index.js';

export default async (text) => {
  const boolText = `Question: ${text} \n\n${asBool}`;
  return toBool(stripResponse(await chatGPT(boolText)));
};
