import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';

export default async function sentiment(text) {
  const prompt = `Identify the overall sentiment of the following text as "positive", "negative", or "neutral" and return only that word.\n\n${text}`;
  const response = await chatGPT(prompt);
  return stripResponse(response).toLowerCase();
}
