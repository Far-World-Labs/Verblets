import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asNumberWithUnits, asUndefinedByDefault, contentIsQuestion } =
  promptConstants;

export default async (text) => {
  const numberText = `${contentIsQuestion} ${text} \n\n${asNumberWithUnits} ${asUndefinedByDefault}`;
  return toNumberWithUnits(stripResponse(await chatGPT(numberText)));
};
