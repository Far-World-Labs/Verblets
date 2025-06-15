import list from '../list/index.js';
import retry from '../../lib/retry/index.js';
import modelService from '../../services/llm-model/index.js';

/**
 * Core prompt template for seed generation using cognitive science principles
 */
export const SEED_GENERATION_PROMPT = `Generate seed items for the category "{categoryName}" using cognitive science principles.

{context}

COGNITIVE PRINCIPLES:
1. Prototype Theory: Include items across the typicality spectrum
2. Family Resemblance: Ensure items share overlapping but not identical features
3. Category Structure: {diversityInstructions}

REQUIREMENTS:
- Include highly typical/prototypical members
- Include moderately typical members
- {diversityRequirement}
- Ensure good coverage of category space
- Avoid redundant or near-identical items

IMPORTANT: Return only clean item names without numbering, descriptions, or explanations.`;

/**
 * Build seed generation prompt with specific parameters
 * @param {string} categoryName - Name of the category
 * @param {Object} config - Configuration options
 * @returns {string} Complete prompt for seed generation
 */
export function buildSeedGenerationPrompt(
  categoryName,
  { context = '', diversityLevel = 'balanced' } = {}
) {
  const diversityInstructions = {
    high: 'Include very diverse examples spanning edge cases and borderline members',
    balanced: 'Include a mix of typical, moderately typical, and some atypical members',
    focused: 'Focus on highly typical, central members with clear category membership',
  };

  const diversityRequirement = {
    high: 'Include many atypical but valid members',
    balanced: 'Include some moderately atypical members',
    focused: 'Focus primarily on typical members',
  };

  const contextLine = context ? `Context: ${context}` : '';

  return SEED_GENERATION_PROMPT.replace('{categoryName}', categoryName)
    .replace('{context}', contextLine)
    .replace(
      '{diversityInstructions}',
      diversityInstructions[diversityLevel] || diversityInstructions.balanced
    )
    .replace(
      '{diversityRequirement}',
      diversityRequirement[diversityLevel] || diversityRequirement.balanced
    );
}

/**
 * Generate seed items for a category using cognitive science principles.
 * Creates diverse, representative examples across the typicality spectrum.
 *
 * @param {string} categoryName - Name of the category
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.context=''] - Context for seed generation
 * @param {number} [options.count=30] - Number of seed items to generate
 * @param {string} [options.diversityLevel='balanced'] - 'high', 'balanced', or 'focused'
 * @param {string|Object} [options.llm='fastGoodCheap'] - LLM model to use
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.retryDelay=1000] - Delay between retries in milliseconds
 * @returns {Promise<string[]>}
 */
export default async function generateSeeds(categoryName, options = {}) {
  if (!categoryName || typeof categoryName !== 'string') {
    throw new Error('categoryName must be a non-empty string');
  }

  const {
    context = '',
    count = 30,
    diversityLevel = 'balanced',
    llm = 'fastGoodCheap',
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const generateWithRetry = async () => {
    const prompt = buildSeedGenerationPrompt(categoryName, { context, diversityLevel });

    // Get the model object from the model service
    const model = typeof llm === 'string' ? modelService.getModel(llm) : llm;

    const results = await list(prompt, {
      model,
      shouldStop: ({ resultsAll }) => resultsAll.length >= count,
    });

    if (!results || results.length === 0) {
      throw new Error(`No seed items generated for category: ${categoryName}`);
    }

    // Return only the requested count
    return results.slice(0, count);
  };

  return retry(generateWithRetry, {
    maxRetries,
    retryDelay,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, or empty results
      return (
        error.message.includes('No seed items generated') ||
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('ECONNRESET')
      );
    },
  });
}

/**
 * Generate seed items for a category using list generation
 * @param {string} category - The category to generate seeds for
 * @param {number} _count - Target number of seeds (unused, kept for API compatibility)
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} Array of seed items
 */
export function generateSeedsList(category, _count = 10, options = {}) {
  // Use the list chain to generate seeds for the category
  return list(category, options);
}
