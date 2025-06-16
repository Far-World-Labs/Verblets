import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { contentIsQuestion } = promptConstants;

export default async function intent({ text, config = {} } = {}) {
  const { llm, ...options } = config;
  const prompt = `${contentIsQuestion} What is the intent of this text?\n\n${text}`;
  const response = await chatGPT(prompt, { modelOptions: { ...llm }, ...options });

  try {
    return JSON.parse(response);
  } catch {
    return { intent: response.trim() };
  }
}
