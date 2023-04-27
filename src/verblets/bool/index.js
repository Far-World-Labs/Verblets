import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import toBool from '../../lib/to-bool/index.js';
import { asBool } from '../../prompts/fragment-texts/index.js';

export default async (text) => {
  const boolText = `Question: ${text} \n\n${asBool}`;
  return toBool(stripResponse(await chatGPT(boolText)));
};
