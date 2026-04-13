import list from '../list/index.js';
import retry from '../../lib/retry/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

const name = 'category-samples';

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

  const contextLine = context ? asXML(context, { tag: 'context' }) : '';

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
 * @param {string|Object} [config.llm={ fast: true, good: true, cheap: true }] - LLM model to use
 * @returns {Promise<string[]>}
 */
async function categorySamples(categoryName, config = {}) {
  if (!categoryName || typeof categoryName !== 'string') {
    throw new Error('categoryName must be a non-empty string');
  }

  const runConfig = nameStep(name, { llm: { fast: true, good: true, cheap: true }, ...config });
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { text: categoryText, context: resolvedContext } = resolveTexts(categoryName, []);
  const { diversity, count } = await getOptions(runConfig, {
    diversity: withPolicy(mapDiversity, ['diversity', 'count']),
  });
  const { context: configContext = '' } = runConfig;
  const effectiveContext = [resolvedContext, configContext].filter(Boolean).join('\n\n');

  const generateWithRetry = async () => {
    const prompt = buildSeedGenerationPrompt(categoryText, {
      context: effectiveContext,
      diversity,
    });

    const results = await list(prompt, {
      ...runConfig,
      shouldStop: ({ resultsAll }) => resultsAll.length >= count,
      onProgress: scopePhase(runConfig.onProgress, 'list:sampling'),
    });

    if (!results || results.length === 0) {
      throw new Error(`No sample items generated for category: ${categoryName}`);
    }

    // Return only the requested count
    return results.slice(0, count);
  };

  try {
    const result = await retry(generateWithRetry, {
      label: 'category-samples',
      config: runConfig,
    });

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

categorySamples.knownTexts = [];

export default categorySamples;
