import commonalities from '../../verblets/commonalities/index.js';
import { rangeCombinations } from '../../lib/combinations/index.js';
import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { intersectionElementsSchema } from './schemas.js';
import intersectionResultSchema from './intersection-result.json';
import { debug } from '../../lib/debug/index.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';
import { initChain } from '../../lib/context/option.js';

const name = 'intersections';

const { strictFormat, contentIsQuestion } = promptConstants;

/**
 * Generalized prompt for finding intersection elements
 */
const INTERSECTION_PROMPT = (categories, instructions) => {
  const basePrompt = `${contentIsQuestion} Find specific examples, instances, or elements that belong to all of these categories: ${categories.join(
    ', '
  )}.

Focus on items that genuinely exist in the intersection of all categories.`;

  const instructionsText = instructions ? `\n\nAdditional context: ${instructions}` : '';

  return `${basePrompt}${instructionsText}

${asXML(categories.join(' | '), { tag: 'categories' })}

${strictFormat}`;
};

/**
 * Parse elements from LLM response
 */
const parseElements = (elements) => {
  if (Array.isArray(elements)) {
    return elements.filter(Boolean);
  }
  return [];
};

/**
 * Process a single combination to get intersection elements and description
 */
const processCombo = async (combo, instructions, config = {}) => {
  const comboKey = combo.join(' + ');

  // Get elements and description in parallel
  const [elementsResponse, intersectionItems] = await Promise.all([
    retry(
      () =>
        callLlm(INTERSECTION_PROMPT(combo, instructions), {
          ...config,
          response_format: jsonSchema('intersection_elements', intersectionElementsSchema),
        }),
      {
        label: 'intersections-elements',
        config,
      }
    ),
    commonalities(combo, { ...config, instructions }),
  ]);

  const elementList = parseElements(elementsResponse);
  const description = Array.isArray(intersectionItems)
    ? intersectionItems.join(', ')
    : String(intersectionItems);

  return {
    key: comboKey,
    intersection: {
      combination: combo,
      description,
      elements: elementList,
    },
  };
};

/**
 * Find intersections for all combinations of items with consistent results
 *
 * @param {Array} items - Array of items to find intersections between
 * @param {Object} config - Configuration options
 * @param {string} config.instructions - Custom instructions for intersection finding
 * @param {number} config.minSize - Minimum combination size (default: 2)
 * @param {number} config.maxSize - Maximum combination size (default: items.length)
 * @param {number} config.batchSize - Number of combinations to process in parallel (default: 10)
 * @param {string|Object} config.llm - LLM model to use (default: 'fastGoodCheap')
 * @param {boolean} config.useSchemaValidation - Whether to validate results with JSON schema (default: false)
 * @returns {Object} Results with combinations, elements, and intersections
 */
export default async function intersections(items, config = {}) {
  if (!Array.isArray(items) || items.length < 2) {
    return {};
  }

  const { config: scopedConfig, useSchemaValidation } = await initChain(
    name,
    { llm: 'fastGoodCheap', ...config },
    {
      useSchemaValidation: false,
    }
  );
  config = scopedConfig;
  const { instructions, minSize = 2, maxSize = items.length, batchSize = 10 } = config;

  // Generate all combinations
  const allCombinations = rangeCombinations(items, minSize, maxSize);

  if (allCombinations.length === 0) {
    return {};
  }

  try {
    // Process all combinations in batches
    const results = {};

    for (let i = 0; i < allCombinations.length; i += batchSize) {
      const batch = allCombinations.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((combo) => processCombo(combo, instructions, config))
      );

      // Add batch results to final results
      for (const result of batchResults) {
        results[result.key] = result.intersection;
      }
    }

    // Validate results with JSON schema if enabled
    if (useSchemaValidation && Object.keys(results).length > 0) {
      const validated = await validateIntersectionResults(results, config);
      const validatedResults = validated.intersections || results;
      emitChainResult(config, name);
      return validatedResults;
    }

    emitChainResult(config, name);

    return results;
  } catch (err) {
    emitChainError(config, name, err);
    throw err;
  }
}

/**
 * Create model options with JSON schema validation
 * @param {string} schemaName - Name for the JSON schema
 * @returns {Object} Model options with schema validation
 */
function createModelOptions(schemaName = 'intersection_result') {
  return {
    response_format: jsonSchema(schemaName, intersectionResultSchema),
  };
}

/**
 * Validate and structure final results using JSON schema
 * @param {Object} intersections - Raw intersection results
 * @param {string|Object} llm - LLM model to use
 * @returns {Promise<Object>} Schema-validated intersection results
 */
async function validateIntersectionResults(intersections, config = {}) {
  if (!intersections || Object.keys(intersections).length === 0) {
    return { intersections: {} };
  }

  const prompt = `Validate and structure these intersection results according to the required schema:

${JSON.stringify(intersections, null, 2)}

Ensure each intersection has:
- combination: array of category names
- description: clear explanation of the intersection
- elements: array of specific examples that belong to ALL categories

Return the properly structured JSON object with an "intersections" property containing the results.`;

  try {
    const response = await retry(
      () => callLlm(prompt, { ...config, ...createModelOptions('intersection_result') }),
      {
        label: 'intersections-validation',
        config,
      }
    );
    // Extract intersections from the object structure
    const resultIntersections = response?.intersections || response;

    // Validate that the result is an object
    if (
      typeof resultIntersections !== 'object' ||
      resultIntersections === null ||
      Array.isArray(resultIntersections)
    ) {
      debug('Schema validation failed: invalid structure, returning original results');
      return { intersections };
    }

    return { intersections: resultIntersections };
  } catch (error) {
    debug('Schema validation failed, returning original results:', error.message);
    return { intersections };
  }
}
