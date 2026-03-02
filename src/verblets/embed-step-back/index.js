import callLlm from '../../lib/llm/index.js';
import { stepBack as stepBackPrompt } from '../../prompts/embed-query-transforms.js';
import { embedStepBackSchema } from './schema.js';

/**
 * Generate broader, more fundamental questions from a specific query.
 *
 * Steps back from specifics to underlying concepts and principles,
 * useful for retrieving background context.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger, count }
 * @param {number} [config.count=3] - Number of step-back questions
 * @returns {Promise<string[]>}
 */
export default async function embedStepBack(query, config = {}) {
  const { llm, count = 3, ...options } = config;

  return await callLlm(stepBackPrompt(query, count), {
    modelOptions: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'step_back',
          schema: embedStepBackSchema,
        },
      },
    },
    ...options,
  });
}
