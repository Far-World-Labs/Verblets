import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { outputSuccinctNames, constants as promptConstants } from '../../prompts/index.js';

const { asUndefinedByDefault, contentIsQuestion } = promptConstants;

export default async function name(subject, config = {}) {
  const { llm, ...options } = config;
  const prompt = `${contentIsQuestion} Suggest a concise, memorable name for the <subject>.\n\n${wrapVariable(subject, {
    tag: 'subject',
  })} ${asUndefinedByDefault}`;
  const response = await chatGPT(prompt, { modelOptions: { ...llm }, ...options });
  const [firstLine] = stripResponse(response).split('\n');
  return firstLine.trim();
}