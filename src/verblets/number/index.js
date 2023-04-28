import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toNumber from '../../lib/to-number/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asNumber, asUndefinedByDefault, contentIsQuestion } = promptConstants;

export default async (text) => {
  const numberText = `${contentIsQuestion} ${text} \n\n${asNumber} ${asUndefinedByDefault}`;
  return toNumber(stripResponse(await chatGPT(numberText)));
};
