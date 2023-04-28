import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toBool from '../../lib/to-bool/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asBool, asUndefinedByDefault, contentIsQuestion } = promptConstants;

export default async (text) => {
  const boolText = `${contentIsQuestion} ${text} \n\n${asBool} ${asUndefinedByDefault}`;
  return toBool(stripResponse(await chatGPT(boolText)));
};
