import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { rewriteQuery as rewriteQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedRewriteQuerySchema } from './schema.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';

const name = 'embed-rewrite-query';

/**
 * Rewrite a search query to be clearer and more specific.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger }
 * @returns {Promise<string>}
 */
export default async function embedRewriteQuery(query, config = {}) {
  const { text: inputQuery, context } = resolveTexts(query, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  try {
    const basePrompt = rewriteQueryPrompt(inputQuery);
    const prompt = context ? `${basePrompt}\n\n${context}` : basePrompt;
    const result = await callLlm(prompt, {
      ...runConfig,
      responseFormat: jsonSchema('rewrite_query', embedRewriteQuerySchema),
    });
    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

embedRewriteQuery.knownTexts = [];
