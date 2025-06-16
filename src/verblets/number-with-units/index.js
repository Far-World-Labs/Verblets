import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asNumberWithUnits, contentIsQuestion, explainAndSeparate, explainAndSeparateJSON } =
  promptConstants;

export default async (text, config = {}) => {
  const { llm, ...options } = config;
  const numberText = `${contentIsQuestion} ${text} \n\n${explainAndSeparate} ${explainAndSeparateJSON}

${asNumberWithUnits}`;

  return toNumberWithUnits(
    stripResponse(await chatGPT(numberText, { modelOptions: { ...llm }, ...options }))
  );
};
