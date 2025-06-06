import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { outputSuccinctNames, constants as promptConstants } from '../../prompts/index.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate, explainAndSeparatePrimitive } =
  promptConstants;

export default async (text, options = {}) => {
  const namePrompt = `${contentIsQuestion} Suggest a short, evocative name capturing the deeper meaning of: ${text}\n\n${explainAndSeparate} ${explainAndSeparatePrimitive}\n\n${outputSuccinctNames(
    5
  )} ${asUndefinedByDefault}`;

  const response = await chatGPT(namePrompt, options);

  return stripResponse(response);
};
