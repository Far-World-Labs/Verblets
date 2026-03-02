import callLlm from '../../lib/llm/index.js';
import { rewriteQuery as rewriteQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedRewriteQuerySchema } from './schema.js';

/**
 * Rewrite a search query to be clearer and more specific.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger }
 * @returns {Promise<string>}
 */
export default async function embedRewriteQuery(query, config = {}) {
  const { llm, ...options } = config;

  return await callLlm(rewriteQueryPrompt(query), {
    modelOptions: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'rewrite_query',
          schema: embedRewriteQuerySchema,
        },
      },
    },
    ...options,
  });
}
