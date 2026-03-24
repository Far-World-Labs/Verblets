import callLlm from '../../lib/llm/index.js';
import { multiQuery as multiQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedMultiQuerySchema } from './schema.js';
import { emitChainResult } from '../../lib/progress-callback/index.js';

const name = 'embed-multi-query';

// ===== Option Mappers =====

/**
 * Map divergence option to prompt guidance for query variant diversity.
 * low: tight paraphrases — improves retrieval precision.
 * high: maximally diverse — improves retrieval recall.
 * Default: moderate diversity (current behavior, no extra guidance).
 * @param {string|undefined} value
 * @returns {string|undefined} Prompt guidance string or undefined
 */
export const mapDivergence = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: 'Stay close to the original query. Use similar phrasing with minor keyword variations and rephrasing. Do not introduce new concepts or tangential angles.',
      med: undefined,
      high: 'Maximize diversity. Include queries that approach the topic from very different angles, use contrasting terminology, and explore adjacent or tangential concepts. Each variant should retrieve documents the others would miss.',
    }[value];
  }
  return undefined;
};

/**
 * Generate diverse search query variants from a single query.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger, count, divergence }
 * @param {number} [config.count=3] - Number of variants to generate
 * @param {string} [config.divergence] - 'low' (tight paraphrases) or 'high' (maximally diverse)
 * @returns {Promise<string[]>}
 */
export default async function embedMultiQuery(query, config = {}) {
  const startTime = Date.now();
  const { count = 3 } = config;
  const divergenceGuidance = mapDivergence(config.divergence);

  const result = await callLlm(multiQueryPrompt(query, count, { divergenceGuidance }), {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'multi_query',
        schema: embedMultiQuerySchema,
      },
    },
  });
  emitChainResult(config, name, { duration: Date.now() - startTime });
  return result;
}
