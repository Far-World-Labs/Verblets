import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toBool from '../../lib/to-bool/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asBool, asUndefinedByDefault, explainAndSeparate, explainAndSeparatePrimitive } =
  promptConstants;

export default async (text, config = {}) => {
  const { llm, ...options } = config;
  const systemPrompt = `
${explainAndSeparate} ${explainAndSeparatePrimitive}

${asBool} ${asUndefinedByDefault}
`;
  const response = await chatGPT(text, {
    modelOptions: {
      systemPrompt,
      ...llm,
    },
    ...options,
  });

  return toBool(stripResponse(response));
};
