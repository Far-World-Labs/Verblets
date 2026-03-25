import callLlm from '../../lib/llm/index.js';
import { rewriteQuery as rewriteQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedRewriteQuerySchema } from './schema.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';

const name = 'embed-rewrite-query';

/**
 * Rewrite a search query to be clearer and more specific.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger }
 * @returns {Promise<string>}
 */
export default async function embedRewriteQuery(query, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  const result = await callLlm(rewriteQueryPrompt(query), {
    ...runConfig,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'rewrite_query',
        schema: embedRewriteQuerySchema,
      },
    },
  });
  emitter.result();
  return result;
}
