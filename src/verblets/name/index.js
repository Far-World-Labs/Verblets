import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import stripResponse from '../../lib/strip-response/index.js';

export default async function name(subject, config = {}) {
  const { llm, ...options } = config;
  const prompt = `Suggest a concise, memorable name for the <subject>.\n\n${wrapVariable(subject, {
    tag: 'subject',
  })}`;
  const response = await chatGPT(prompt, { modelOptions: { ...llm }, ...options });
  const [firstLine] = stripResponse(response).split('\n');
  return firstLine.trim();
}
