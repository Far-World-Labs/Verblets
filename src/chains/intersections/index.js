import commonalities from '../../verblets/commonalities/index.js';
import { rangeCombinations } from '../../lib/combinations/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { intersectionElementsSchema } from './schemas.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { asJSON, asWrappedArrayJSON, strictFormat, contentIsQuestion } = promptConstants;

/**
 * Load the JSON schema for intersection results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getIntersectionSchema() {
  const schemaPath = path.join(__dirname, 'intersection-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

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

${strictFormat} ${asWrappedArrayJSON}

${asJSON}`;
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
const processCombo = async (combo, instructions) => {
  const comboKey = combo.join(' + ');

  // Get elements and description in parallel
  const [elementsResponse, intersectionItems] = await Promise.all([
    chatGPT(INTERSECTION_PROMPT(combo, instructions), {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'intersection_elements',
            schema: intersectionElementsSchema,
          },
        },
      },
    }),
    commonalities(combo, { instructions }),
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
 * @param {Object} options - Configuration options
 * @param {string} options.instructions - Custom instructions for intersection finding
 * @param {number} options.minSize - Minimum combination size (default: 2)
 * @param {number} options.maxSize - Maximum combination size (default: items.length)
 * @param {number} options.batchSize - Number of combinations to process in parallel (default: 10)
 * @param {string|Object} options.llm - LLM model to use (default: 'fastGoodCheap')
 * @param {boolean} options.useSchemaValidation - Whether to validate results with JSON schema (default: false)
 * @returns {Object} Results with combinations, elements, and intersections
 */
export default async function intersections(items, options = {}) {
  if (!Array.isArray(items) || items.length < 2) {
    return {};
  }

  const {
    instructions,
    minSize = 2,
    maxSize = items.length,
    batchSize = 10,
    llm = 'fastGoodCheap',
    useSchemaValidation = false,
  } = options;

  // Generate all combinations
  const allCombinations = rangeCombinations(items, minSize, maxSize);

  if (allCombinations.length === 0) {
    return {};
  }

  // Process all combinations in batches
  const results = {};

  for (let i = 0; i < allCombinations.length; i += batchSize) {
    const batch = allCombinations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((combo) => processCombo(combo, instructions)));

    // Add batch results to final results
    for (const result of batchResults) {
      results[result.key] = result.intersection;
    }
  }

  // Validate results with JSON schema if enabled
  if (useSchemaValidation && Object.keys(results).length > 0) {
    const validated = await validateIntersectionResults(results, llm);
    return validated.intersections || results;
  }

  return results;
}

/**
 * Create model options with JSON schema validation
 * @param {string|Object} llm - LLM model to use
 * @param {string} schemaName - Name for the JSON schema
 * @returns {Promise<Object>} Model options with schema validation
 */
async function createModelOptions(llm = 'fastGoodCheap', schemaName = 'intersection_result') {
  const schema = await getIntersectionSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: schemaName,
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else {
    return {
      ...llm,
      response_format: responseFormat,
    };
  }
}

/**
 * Validate and structure final results using JSON schema
 * @param {Object} intersections - Raw intersection results
 * @param {string|Object} llm - LLM model to use
 * @returns {Promise<Object>} Schema-validated intersection results
 */
async function validateIntersectionResults(intersections, llm = 'fastGoodCheap') {
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
    const modelOptions = await createModelOptions(llm, 'intersection_result');
    const response = await chatGPT(prompt, { modelOptions });
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;

    // Extract intersections from the object structure
    const resultIntersections = parsed?.intersections || parsed;

    // Validate that the result is an object
    if (
      typeof resultIntersections !== 'object' ||
      resultIntersections === null ||
      Array.isArray(resultIntersections)
    ) {
      console.warn('Schema validation failed: invalid structure, returning original results');
      return { intersections };
    }

    return { intersections: resultIntersections };
  } catch (error) {
    console.warn('Schema validation failed, returning original results:', error.message);
    return { intersections };
  }
}
