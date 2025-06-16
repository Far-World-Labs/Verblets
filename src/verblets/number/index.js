import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toNumber from '../../lib/to-number/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const {
  asNumber,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

export default async (text, config = {}) => {
  const { llm, ...options } = config;
  const numberText = `${contentIsQuestion} ${text}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber} ${asUndefinedByDefault}`;

  return toNumber(
    stripResponse(await chatGPT(numberText, { modelOptions: { ...llm }, ...options }))
  );
};
