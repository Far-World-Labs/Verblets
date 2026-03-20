import list from '../list/index.js';
import retry from '../../lib/retry/index.js';
import { scopeProgress } from '../../lib/progress-callback/index.js';
import { getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';

// ===== Option Mappers =====

const DEFAULT_DIVERSITY = { diversity: undefined, count: 30 };

/**
 * Map diversity option to sampling strategy + count coordination.
 * low: focused on typical members, fewer candidates needed.
 * high: diverse spanning edge cases, more candidates needed.
 * med: explicit normal mode — balanced, default count.
 * @param {string|object|undefined} value
 * @returns {{ diversity: string|undefined, count: number }}
 */
export const mapDiversity = (value) => {
  if (value === undefined) return DEFAULT_DIVERSITY;
  if (typeof value === 'object') return value;
  return (
    {
      low: { diversity: 'low', count: 15 },
      med: DEFAULT_DIVERSITY,
      high: { diversity: 'high', count: 50 },
    }[value] ?? DEFAULT_DIVERSITY
  );
};

/**
 * Core prompt template for sample generation using cognitive science principles
 */
export const SAMPLE_GENERATION_PROMPT = `Generate sample items for the category "{categoryName}" using cognitive science principles.

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
 * Build sample generation prompt with specific parameters
 * @param {string} categoryName - Name of the category
 * @param {Object} config - Configuration options
 * @returns {string} Complete prompt for sample generation
 */
export function buildSeedGenerationPrompt(categoryName, { context = '', diversity } = {}) {
  const diversityInstructions = {
    high: 'Include very diverse examples spanning edge cases and borderline members',
    default: 'Include a mix of typical, moderately typical, and some atypical members',
    low: 'Focus on highly typical, central members with clear category membership',
  };

  const diversityRequirement = {
    high: 'Include many atypical but valid members',
    default: 'Include some moderately atypical members',
    low: 'Focus primarily on typical members',
  };

  const contextLine = context ? `Context: ${context}` : '';

  return SAMPLE_GENERATION_PROMPT.replace('{categoryName}', categoryName)
    .replace('{context}', contextLine)
    .replace(
      '{diversityInstructions}',
      diversityInstructions[diversity] || diversityInstructions.default
    )
    .replace(
      '{diversityRequirement}',
      diversityRequirement[diversity] || diversityRequirement.default
    );
}

/**
 * Generate sample items for a category using cognitive science principles.
 * Creates diverse, representative examples across the typicality spectrum.
 *
 * @param {string} categoryName - Name of the category
 * @param {Object} [config={}] - Configuration options
 * @param {string} [config.context=''] - Context for sample generation
 * @param {number} [config.count=30] - Number of sample items to generate
 * @param {string} [config.diversity] - 'low' or 'high' (default: balanced behavior)
 * @param {string|Object} [config.llm='fastGoodCheap'] - LLM model to use
 * @returns {Promise<string[]>}
 */
export default async function categorySamples(categoryName, config = {}) {
  if (!categoryName || typeof categoryName !== 'string') {
    throw new Error('categoryName must be a non-empty string');
  }

  config = scopeOperation('category-samples', { llm: 'fastGoodCheap', ...config });
  const { context = '', now } = config;
  const { diversity, count } = await getOptions(config, {
    diversity: withPolicy(mapDiversity, ['diversity', 'count']),
  });
  const generateWithRetry = async () => {
    const prompt = buildSeedGenerationPrompt(categoryName, { context, diversity });

    const results = await list(prompt, {
      ...config,
      shouldStop: ({ resultsAll }) => resultsAll.length >= count,
      onProgress: scopeProgress(config.onProgress, 'list:sampling'),
      now,
    });

    if (!results || results.length === 0) {
      throw new Error(`No sample items generated for category: ${categoryName}`);
    }

    // Return only the requested count
    return results.slice(0, count);
  };

  return await retry(generateWithRetry, {
    label: 'category-samples',
    config,
  });
}

/**
 * Generate sample items for a category using list generation
 * @param {string} category - The category to generate samples for
 * @param {number} _count - Target number of samples (unused, kept for API compatibility)
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} Array of sample items
 */
export function categorySamplesList(category, _count = 10, options = {}) {
  // Use the list chain to generate samples for the category
  return list(category, options);
}
