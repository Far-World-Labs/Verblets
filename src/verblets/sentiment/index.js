import callLlm from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { sentimentSchema } from './schema.js';

const name = 'sentiment';

/**
 * Extract sentiment from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<string>} Sentiment classification (positive, negative, or neutral)
 */
export default async function sentiment(text, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const prompt = `Identify the overall sentiment of the following text as "positive", "negative", or "neutral".\n\nText: ${text}\n\nThe value should be the sentiment classification.`;

  try {
    const response = await callLlm(prompt, {
      ...runConfig,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_analysis',
          schema: sentimentSchema,
        },
      },
    });

    emitter.complete({ outcome: 'success' });

    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
