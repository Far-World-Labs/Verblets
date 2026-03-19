import callLlm from '../../lib/llm/index.js';
import { decomposeQuery as decomposeQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedSubquestionsSchema } from './schema.js';

// ===== Option Mappers =====

/**
 * Map granularity option to prompt guidance for decomposition depth.
 * low: coarse — 2-3 major sub-questions covering broad facets.
 * high: fine-grained — many targeted sub-questions, each targeting a single fact.
 * Default: balanced decomposition (current behavior, no extra guidance).
 * @param {string|undefined} value
 * @returns {string|undefined} Prompt guidance string or undefined
 */
export const mapGranularity = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: 'Decompose into only 2-3 broad sub-questions. Each sub-question should cover a major facet of the original query rather than targeting individual facts. Prefer fewer, broader questions over many narrow ones.',
      med: undefined,
      high: 'Decompose into many fine-grained sub-questions. Each sub-question should target a single specific fact, entity, or data point needed to fully answer the original query. Be thorough — prefer many narrow, precise questions over fewer broad ones.',
    }[value];
  }
  return undefined;
};

/**
 * Decompose a complex query into simpler, atomic sub-questions.
 *
 * Each sub-question targets a single piece of information needed
 * to fully answer the original query.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger, granularity }
 * @param {string} [config.granularity] - 'low' (coarse) or 'high' (fine-grained)
 * @returns {Promise<string[]>}
 */
export default async function embedSubquestions(query, config = {}) {
  const { llm, granularity, ...options } = config;
  const granularityGuidance = mapGranularity(granularity);

  return await callLlm(decomposeQueryPrompt(query, { granularityGuidance }), {
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
