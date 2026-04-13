import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { sentimentSchema } from './schema.js';

const verbletName = 'sentiment';

/**
 * Extract sentiment from text input
 * @param {string|object} text - The text to analyze (string or instruction bundle)
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<string>} Sentiment classification (positive, negative, or neutral)
 */
export default async function sentiment(text, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  const prompt = [
    `Identify the overall sentiment of the following text as "positive", "negative", or "neutral".

${asXML(inputText, { tag: 'text' })}

The value should be the sentiment classification.`,
    context,
  ]
    .filter(Boolean)
    .join('\n\n');

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

sentiment.knownTexts = [];
