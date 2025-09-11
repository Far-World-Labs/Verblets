import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { scaleSpecificationJsonSchema } from './schemas.js';
import scaleResultSchema from './scale-result.json';

const { onlyJSON } = promptConstants;

// ===== Default Instructions =====

const DEFAULT_MAP_INSTRUCTIONS = `Apply the scale to each item and return only the transformed value.`;

const DEFAULT_FILTER_INSTRUCTIONS = `Keep items whose scaled values fall in the upper half of the scale's range.

Note: This evaluates against the scale's defined range, not the batch's actual distribution.`;

const DEFAULT_FIND_INSTRUCTIONS = `Select an item whose scaled value falls in the upper quartile of the scale's range.

Note: This evaluates against the scale's defined range, not the global maximum across all batches.`;

const DEFAULT_GROUP_INSTRUCTIONS = `Group items based on natural divisions in the scale's range (e.g., low/medium/high).`;

const REDUCE_PROCESS_STEPS = `Transform each item with the scale, then apply the reduce operation to accumulate the results.`;

const FILTER_PROCESS_STEPS = `Apply the scale to determine which items meet the filter criteria.`;

const FIND_PROCESS_STEPS = `Use the scale to identify and return the item that best matches the selection criteria.`;

const GROUP_PROCESS_STEPS = `Apply the scale to determine each item's group assignment.`;

// ===== Core Functions =====

/**
 * Generate a scale specification from instructions
 * @param {string} prompt - Natural language scaling instructions
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<Object>} Scale specification with domain, range, and mapping
 */
export async function scaleSpec(prompt, config = {}) {
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...rest } = config;

  const specSystemPrompt = `You are a scale specification generator. Analyze the scaling instructions and produce a clear, comprehensive specification.`;

  const specUserPrompt = `Analyze these scaling instructions and generate a scale specification.

${asXML(prompt, { tag: 'scaling-instructions' })}

Provide a JSON object with exactly three string properties:
- domain: A single string describing expected input types, formats, and valid ranges
- range: A single string describing output types, formats, and possible values  
- mapping: A single string with clear description of how inputs map to outputs, including any formulas, rules, edge cases, and examples

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

  const response = await retry(chatGPT, {
    label: 'scale spec',
    maxAttempts,
    onProgress,
    now,
    chainStartTime: now,
    chatGPTPrompt: specUserPrompt,
    chatGPTConfig: {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: scaleSpecificationJsonSchema,
        },
      },
      llm,
      system: specSystemPrompt,
      ...rest,
    },
    logger: rest.logger,
  });

  return response;
}

/**
 * Apply a scale specification to a single item
 * @param {*} item - Item to scale
 * @param {Object} specification - Pre-generated scale specification
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<*>} Scaled value (type depends on specification range)
 */
export async function applyScale(item, specification, config = {}) {
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...options } = config;

  const prompt = `Apply the scale specification to transform this item.

${asXML(specification, { tag: 'scale-specification' })}

${asXML(item, { tag: 'item' })}

Transform this item according to the specification.
Return a JSON object with a "value" property containing the scaled result.

${onlyJSON}`;

  const response = await retry(chatGPT, {
    label: 'scale item',
    maxAttempts,
    onProgress,
    now,
    chainStartTime: now,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'scale_result',
            schema: scaleResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
    logger: options.logger,
  });

  return response;
}

/**
 * Scale a single item
 * @param {*} item - Item to scale
 * @param {string} instructions - Scaling instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Scaled value
 */
export async function scaleItem(item, instructions, config = {}) {
  const { now = new Date(), ...restConfig } = config;
  const spec = await scaleSpec(instructions, { now, ...restConfig });
  return await applyScale(item, spec, { now, ...restConfig });
}

// ===== Instruction Builders =====

/**
 * Create map instructions for scaling
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated scale specification
 * @param {string} params.processing - Additional processing instructions (optional)
 * @returns {string} Instructions string
 */
export function mapInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'processing-instructions' })}

Apply this scale to transform each item:
${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    return `${DEFAULT_MAP_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }
}

/**
 * Create filter instructions for scaling
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated scale specification
 * @param {string} params.processing - Filter criteria (optional - defaults based on scale midpoint)
 * @returns {string} Instructions string
 */
export function filterInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'filter-criteria' })}

${FILTER_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    return `${DEFAULT_FILTER_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }
}

/**
 * Create reduce instructions for scaling
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated scale specification
 * @param {string} params.processing - How to reduce the scaled values
 * @returns {string} Instructions string
 */
export function reduceInstructions({ specification, processing }) {
  return `${asXML(processing, { tag: 'reduce-operation' })}

${REDUCE_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
}

/**
 * Create find instructions for scaling
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated scale specification
 * @param {string} params.processing - Selection criteria (optional - defaults to upper quartile)
 * @returns {string} Instructions string
 */
export function findInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'selection-criteria' })}

${FIND_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    return `${DEFAULT_FIND_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }
}

/**
 * Create group instructions for scaling
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated scale specification
 * @param {string} params.processing - Grouping strategy (optional - defaults to ranges)
 * @returns {string} Instructions string
 */
export function groupInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'grouping-strategy' })}

${GROUP_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    return `${DEFAULT_GROUP_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }
}

// ===== Advanced Scale Functions =====

/**
 * Create a scale function with a pre-generated specification
 * @param {Object} specification - Pre-generated scale specification
 * @param {Object} config - Configuration options
 * @returns {Function} Scaling function with specification property
 */
export function createScale(specification, config = {}) {
  const scaleFunction = async function (input) {
    return await applyScale(input, specification, config);
  };

  // Add specification property for introspection
  Object.defineProperty(scaleFunction, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  return scaleFunction;
}

/**
 * Original scale function - simple, stateless version
 * @param {string} prompt - Scaling instructions
 * @param {Object} config - Configuration options
 * @returns {Function} Scaling function
 */
export default function scale(prompt, config = {}) {
  const scaleFunction = async function (input) {
    return await scaleItem(input, prompt, config);
  };

  Object.defineProperty(scaleFunction, 'prompt', {
    get() {
      return prompt;
    },
    enumerable: true,
  });

  return scaleFunction;
}
