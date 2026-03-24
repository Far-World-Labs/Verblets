import callLlm from '../../lib/llm/index.js';
import { rewriteQuery as rewriteQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedRewriteQuerySchema } from './schema.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';

const name = 'embed-rewrite-query';

/**
 * Rewrite a search query to be clearer and more specific.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger }
 * @returns {Promise<string>}
 */
export default async function embedRewriteQuery(query, config = {}) {
  const startTime = Date.now();
  try {
    const result = await callLlm(rewriteQueryPrompt(query), {
      ...config,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'rewrite_query',
          schema: embedRewriteQuerySchema,
        },
      },
    });
    emitChainResult(config, name, { duration: Date.now() - startTime });
    return result;
  } catch (err) {
    emitChainError(config, name, err, { duration: Date.now() - startTime });
    throw err;
  }
}
