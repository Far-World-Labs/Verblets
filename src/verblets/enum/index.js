import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toEnum from '../../lib/to-enum/index.js';
import { asEnum, constants } from '../../prompts/index.js';

const { asUndefinedByDefault, contentIsQuestion, explainAndSeparate } = constants;

export default async (text, enumVal, config = {}) => {
  const { llm, ...options } = config;
  const enumText = `${contentIsQuestion} ${text}\n\n${explainAndSeparate}

${asEnum(enumVal)} ${asUndefinedByDefault}`;

  return toEnum(
    stripResponse(await chatGPT(enumText, { modelOptions: { ...llm }, ...options })),
    enumVal
  );
};
