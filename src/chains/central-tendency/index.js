import map from '../map/index.js';
import { CENTRAL_TENDENCY_CORE } from '../../verblets/central-tendency-lines/index.js';
import { centralTendencyResultsJsonSchema } from './schemas.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { asXML } from '../../prompts/wrap-variable.js';

const name = 'central-tendency';

const centralTendencyResponseFormat = jsonSchema(
  centralTendencyResultsJsonSchema.name,
  centralTendencyResultsJsonSchema.schema
);

/**
 * Build instructions for central tendency evaluation using the core cognitive framework.
 * @param {string[]} seedItems - Array of seed items for comparison
 * @param {Object} [options]
 * @param {string} [options.context] - Context description
 * @param {string[]} [options.coreFeatures] - Known core features
 * @returns {string} Instructions for the mapper
 */
function buildCentralTendencyInstructions(seedItems, { context = '', coreFeatures = [] } = {}) {
  const outputRequirements = `OUTPUT FORMAT: For each item, provide:
- score: A number between 0 and 1 indicating centrality
- reason: A brief explanation of the scoring
- confidence: A number between 0 and 1 indicating confidence in the assessment`;

  const parts = [
    'For each item, evaluate its centrality among these category members:',
    asXML(seedItems.join(', '), { tag: 'seed-items' }),
    'Use cognitive science principles of prototype theory and family resemblance.',
    context && asXML(context, { tag: 'context' }),
    coreFeatures.length > 0 && asXML(coreFeatures.join(', '), { tag: 'core-features' }),
    CENTRAL_TENDENCY_CORE,
    outputRequirements,
  ];

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Process multiple items for central tendency evaluation with retry support.
 * Uses the map infrastructure for efficiency and reliability.
 *
 * @param {string[]} items - Array of items to evaluate
 * @param {string[]} seedItems - Array of seed items for comparison
 * @param {Object} [config={}] - Configuration options
 * @param {string} [config.context=''] - Context description for evaluation
 * @param {string[]} [config.coreFeatures=[]] - Known core/definitional features
 * @param {string|Object} [config.llm] - LLM model configuration
 * @param {number} [config.batchSize=5] - Batch size for processing
 * @param {number} [config.maxAttempts=3] - Max retry attempts for failed items
 * @returns {Promise<Array>} Array of central tendency results
 */
export default async function centralTendency(items, seedItems, config = {}) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  if (items.length === 0) {
    return [];
  }

  if (!Array.isArray(seedItems) || seedItems.length === 0) {
    throw new Error('seedItems must be a non-empty array');
  }

  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: items });
  const { batchSize } = await getOptions(runConfig, {
    batchSize: 5,
  });

  try {
    const instructions = buildCentralTendencyInstructions(seedItems, runConfig);

    const results = await map(items, instructions, {
      ...runConfig,
      batchSize,
      responseFormat: centralTendencyResponseFormat,
      onProgress: scopePhase(runConfig.onProgress, 'map:evaluation'),
    });

    const isValid = (r) => r && typeof r === 'object' && typeof r.score === 'number';
    const successCount = results.filter(isValid).length;
    const resultMeta = {
      totalItems: results.length,
      successCount,
      failureCount: results.length - successCount,
    };
    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({ outcome: Outcome.success, ...resultMeta });

    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

centralTendency.knownTexts = [];
