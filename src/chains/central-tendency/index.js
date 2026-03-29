import map from '../map/index.js';
import { CENTRAL_TENDENCY_PROMPT } from '../../verblets/central-tendency-lines/index.js';
import { centralTendencyResultsJsonSchema } from './schemas.js';
import { extractPromptAnalysis } from '../../lib/progress/extract.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Level } from '../../lib/progress/constants.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

const name = 'central-tendency';

const centralTendencyResponseFormat = jsonSchema(
  centralTendencyResultsJsonSchema.name,
  centralTendencyResultsJsonSchema.schema
);

/**
 * Build instructions for central tendency evaluation using the core verblet prompt
 * @param {string[]} seedItems - Array of seed items for comparison
 * @param {Object} config - Configuration options
 * @returns {string} Instructions for the mapper
 */
function buildCentralTendencyInstructions(seedItems, { context = '', coreFeatures = [] } = {}) {
  const contextLine = context ? `Context: ${context}` : '';
  const coreFeaturesLine =
    coreFeatures.length > 0 ? `Core Features: ${coreFeatures.join(', ')}` : '';
  const outputRequirementsLine = `OUTPUT FORMAT: For each item, provide:
- score: A number between 0 and 1 indicating centrality
- reason: A brief explanation of the scoring
- confidence: A number between 0 and 1 indicating confidence in the assessment`;

  // Use the core prompt with all variables replaced
  const corePrompt = CENTRAL_TENDENCY_PROMPT.replace('{context}', contextLine)
    .replace('{coreFeatures}', coreFeaturesLine)
    .replace('{outputRequirements}', outputRequirementsLine);

  return `For each item, evaluate its centrality among these category members: ${seedItems.join(
    ', '
  )}

${corePrompt}`;
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
 * @param {string|Object} [config.llm='fastGoodCheap'] - LLM model to use
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
  const { batchSize } = await getOptions(runConfig, {
    batchSize: 5,
  });
  emitter.start({ message: 'Central-tendency chain starting', totalItems: items.length, seedCount: seedItems.length, batchSize });

  // Build instructions for the mapper
  const instructions = buildCentralTendencyInstructions(seedItems, runConfig);

  // Log instruction construction
  emitter.emit({
    event: DomainEvent.step,
    stepName: 'construction',
    level: Level.debug,
    ...extractPromptAnalysis(instructions),
    itemCount: items.length,
    seedCount: seedItems.length,
  });

  // Use map to handle all the complexity
  const results = await map(items, instructions, {
    ...runConfig,
    batchSize,
    responseFormat: centralTendencyResponseFormat,
    onProgress: scopePhase(runConfig.onProgress, 'map:evaluation'),
  });

  // Log the final output from the chain
  const resultMeta = {
    totalItems: results.length,
    successCount: results.filter((r) => r !== undefined).length,
    failureCount: results.filter((r) => r === undefined).length,
  };
  emitter.complete({ message: 'Central-tendency chain complete', ...resultMeta });

  return results;
}
