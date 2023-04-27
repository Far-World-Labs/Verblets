import chatGPT from '../../lib/openai/completions.js';
import { asNumber } from '../../prompts/fragment-texts/index.js';
import { stripResponse, toNumber } from '../../response-parsers/index.js';

export default async (text) => {
  const numberText = `Question: ${text} \n\n${asNumber}`;
  return toNumber(stripResponse(await chatGPT(numberText)));
};
