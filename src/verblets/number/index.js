import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import toNumber from '../../lib/to-number/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asNumber } = promptConstants;

export default async (text) => {
  const numberText = `Question: ${text} \n\n${asNumber}`;
  return toNumber(stripResponse(await chatGPT(numberText)));
};
