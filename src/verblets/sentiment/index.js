import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asXML } from '../../prompts/wrap-variable.js';
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

  const prompt = `Identify the overall sentiment of the following text as "positive", "negative", or "neutral".

${asXML(text, { tag: 'text' })}

The value should be the sentiment classification.`;

  try {
    const response = await callLlm(prompt, {
      ...runConfig,
      responseFormat: jsonSchema('sentiment_analysis', sentimentSchema),
    });

    emitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
