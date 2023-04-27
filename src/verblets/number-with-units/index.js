import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { asNumberWithUnits } from '../../prompts/fragment-texts/index.js';

export default async (text) => {
  const numberText = `Question: ${text} \n\n${asNumberWithUnits}`;
  return toNumberWithUnits(stripResponse(await chatGPT(numberText)));
};
