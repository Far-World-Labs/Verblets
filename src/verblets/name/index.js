import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import stripResponse from '../../lib/strip-response/index.js';

export default async function name(subject) {
  const prompt = `Suggest a concise, memorable name for the <subject>.\n\n${wrapVariable(subject, {
    tag: 'subject',
  })}`;
  const response = await chatGPT(prompt);
  const [firstLine] = stripResponse(response).split('\n');
  return firstLine.trim();
}
