import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toBool from '../../lib/to-bool/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const {
  asBool,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

export default async (text) => {
  const boolText = `${contentIsQuestion} ${text}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}`;

  const response = await chatGPT(boolText, {
    modelOptions: { maxTokens: 100 },
  });

  return toBool(stripResponse(response));
};
