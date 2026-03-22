import callLlm from '../../lib/llm/index.js';
import { sentimentSchema } from './schema.js';

/**
 * Extract sentiment from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<string>} Sentiment classification (positive, negative, or neutral)
 */
export default async function sentiment(text, config = {}) {
  const prompt = `Identify the overall sentiment of the following text as "positive", "negative", or "neutral".\n\nText: ${text}\n\nThe value should be the sentiment classification.`;

  const response = await callLlm(prompt, {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'sentiment_analysis',
        schema: sentimentSchema,
      },
    },
  });

  return response;
}
