import chatGPT from '../../lib/chatgpt/index.js';
import { sentimentSchema } from './schema.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asJSON, asWrappedValueJSON } = promptConstants;

/**
 * Extract sentiment from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<string>} Sentiment classification (positive, negative, or neutral)
 */
export default async function sentiment(text, config = {}) {
  const { llm, ...options } = config;
  const prompt = `Identify the overall sentiment of the following text as "positive", "negative", or "neutral".\n\nText: ${text}\n\n${asWrappedValueJSON} The value should be the sentiment classification.\n\n${asJSON}`;

  const response = await chatGPT(prompt, {
    modelOptions: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_analysis',
          schema: sentimentSchema,
        },
      },
    },
    ...options,
  });

  return response;
}
