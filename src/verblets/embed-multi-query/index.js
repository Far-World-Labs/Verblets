import callLlm from '../../lib/llm/index.js';
import { multiQuery as multiQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedMultiQuerySchema } from './schema.js';

/**
 * Generate diverse search query variants from a single query.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger, count }
 * @param {number} [config.count=3] - Number of variants to generate
 * @returns {Promise<string[]>}
 */
export default async function embedMultiQuery(query, config = {}) {
  const { llm, count = 3, ...options } = config;

  return await callLlm(multiQueryPrompt(query, count), {
    modelOptions: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'multi_query',
          schema: embedMultiQuerySchema,
        },
      },
    },
    ...options,
  });
}
