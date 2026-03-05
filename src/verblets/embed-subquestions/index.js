import callLlm from '../../lib/llm/index.js';
import { decomposeQuery as decomposeQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedSubquestionsSchema } from './schema.js';

/**
 * Decompose a complex query into simpler, atomic sub-questions.
 *
 * Each sub-question targets a single piece of information needed
 * to fully answer the original query.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger }
 * @returns {Promise<string[]>}
 */
export default async function embedSubquestions(query, config = {}) {
  const { llm, ...options } = config;

  return await callLlm(decomposeQueryPrompt(query), {
    llm,
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'decompose_query',
          schema: embedSubquestionsSchema,
        },
      },
    },
    ...options,
  });
}
