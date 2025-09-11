import map from '../map/index.js';
import { CENTRAL_TENDENCY_PROMPT } from '../../verblets/central-tendency-lines/index.js';
import { centralTendencyResultsJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractPromptAnalysis } from '../../lib/lifecycle-logger/index.js';

const centralTendencyResponseFormat = {
  type: 'json_schema',
  json_schema: centralTendencyResultsJsonSchema,
};

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
 * @param {number} [config.chunkSize=5] - Batch size for processing
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

  const {
    chunkSize = 5,
    maxAttempts = 3,
    logger,
    onProgress,
    now = new Date(),
    ...otherConfig
  } = config;

  // Create lifecycle logger for the chain
  const lifecycleLogger = createLifecycleLogger(logger, 'central-tendency-chain');

  // Log the initial input to the chain
  lifecycleLogger.logStart({
    items,
    seedItems,
    context: otherConfig.context,
    coreFeatures: otherConfig.coreFeatures,
    itemCount: items.length,
    seedCount: seedItems.length,
  });

  try {
    // Build instructions for the mapper
    const instructions = buildCentralTendencyInstructions(seedItems, otherConfig);

    // Log instruction construction
    lifecycleLogger.logConstruction(instructions, extractPromptAnalysis(instructions));

    // Use map to handle all the complexity
    const results = await map(items, instructions, {
      chunkSize,
      maxAttempts,
      responseFormat: centralTendencyResponseFormat,
      logger: lifecycleLogger, // Pass logger to map for its own logging
      onProgress,
      now,
    });

    // Extract results from the structured output
    // Map returns an array where each element is the response for that item
    const finalResults = results.map((result) => {
      if (result === undefined) {
        return undefined;
      }
      // With structured output, we get objects directly
      return result;
    });

    // Log the final output from the chain
    lifecycleLogger.logResult(finalResults, {
      totalItems: finalResults.length,
      successCount: finalResults.filter((r) => r !== undefined).length,
      failureCount: finalResults.filter((r) => r === undefined).length,
    });

    return finalResults;
  } catch (error) {
    lifecycleLogger.logError(error);
    throw error;
  }
}

// Export the retry version as well for consistency with other bulk processors
export const centralTendencyRetry = centralTendency;
