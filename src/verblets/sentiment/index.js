import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';

/**
 * Extract sentiment from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<string>} Sentiment classification (positive, negative, or neutral)
 */
export default async function sentiment(text, config = {}) {
  const { llm, ...options } = config;
  const prompt = `Identify the overall sentiment of the following text as "positive", "negative", or "neutral" and return only that word.\n\n${text}`;
  const response = await chatGPT(prompt, { modelOptions: { ...llm }, ...options });
  return stripResponse(response).toLowerCase();
}
