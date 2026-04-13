import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { multiQuery as multiQueryPrompt } from '../../prompts/embed-query-transforms.js';
import { embedMultiQuerySchema } from './schema.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';

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
  return value;
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
  const { text: inputQuery, context } = resolveTexts(query, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  try {
    const { divergence: divergenceGuidance, count } = await getOptions(runConfig, {
      divergence: withPolicy(mapDivergence),
      count: 3,
    });

    const basePrompt = multiQueryPrompt(inputQuery, count, { divergenceGuidance });
    const prompt = context ? `${basePrompt}\n\n${context}` : basePrompt;
    const result = await callLlm(prompt, {
      ...runConfig,
      responseFormat: jsonSchema('multi_query', embedMultiQuerySchema),
    });
    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

embedMultiQuery.knownTexts = [];
