import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import toBool from '../../lib/to-bool/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asBool } = promptConstants;

export default async (text) => {
  const boolText = `Question: ${text} \n\n${asBool}`;
  return toBool(stripResponse(await chatGPT(boolText)));
};
