import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { scaleSpecificationJsonSchema } from './schemas.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const { onlyJSON } = promptConstants;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const scaleResultSchema = JSON.parse(readFileSync(join(__dirname, 'scale-result.json'), 'utf8'));

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
 * @returns {Promise<Object>} Scale specification with domain, range, and mapping
 */
export async function scaleSpec(prompt, config = {}) {
  const { llm, ...rest } = config;

  const specSystemPrompt = `You are a scale specification generator. Analyze the scaling instructions and produce a clear, comprehensive specification.`;

  const specUserPrompt = `Analyze these scaling instructions and generate a scale specification.

${asXML(prompt, { tag: 'scaling-instructions' })}

Provide a JSON object with exactly three string properties:
- domain: A single string describing expected input types, formats, and valid ranges
- range: A single string describing output types, formats, and possible values  
- mapping: A single string with clear description of how inputs map to outputs, including any formulas, rules, edge cases, and examples

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

  const response = await chatGPT(specUserPrompt, {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: scaleSpecificationJsonSchema,
      },
    },
    llm,
    system: specSystemPrompt,
    ...rest,
  });

  return response;
}

/**
 * Apply a scale specification to a single item
 * @param {*} item - Item to scale
 * @param {Object} specification - Pre-generated scale specification
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Scaled value (type depends on specification range)
 */
export async function applyScale(item, specification, config = {}) {
  const { llm, ...options } = config;

  const prompt = `Apply the scale specification to transform this item.

${asXML(specification, { tag: 'scale-specification' })}

${asXML(item, { tag: 'item' })}

Transform this item according to the specification.
Return a JSON object with a "value" property containing the scaled result.

${onlyJSON}`;

  const response = await chatGPT(prompt, {
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
  const spec = await scaleSpec(instructions, config);
  return await applyScale(item, spec, config);
}

// ===== Instruction Builders =====

/**
 * Helper to create instruction with attached specification
 * @param {string} instructions - The instruction string
 * @param {Object} specification - The specification object
 * @param {boolean} returnTuple - Whether to return as tuple
 * @returns {string|Object} Instructions with specification attached or tuple
 */
function createInstructionResult(instructions, specification, returnTuple) {
  if (returnTuple) {
    return { value: instructions, specification };
  }
  // Attach specification as a property to the string
  return Object.assign(instructions, { specification });
}

/**
 * Create map instructions for scaling
 * @param {string|Object} instructions - Scaling criteria string or instructions object
 * @param {string} instructions.scaling - How to scale each item
 * @param {string} instructions.processing - Additional processing instructions (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scaleSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function mapInstructions(instructions, config = {}, createSpec = scaleSpec) {
  // Handle backward compatibility - if instructions is a string, use it as scaling
  const scaling = typeof instructions === 'string' ? instructions : instructions.scaling;
  const processing = typeof instructions === 'object' ? instructions.processing : null;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scaling, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'processing-instructions' })}

Apply this scale to transform each item:
${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_MAP_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create filter instructions for scaling
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scaling - How to scale each item
 * @param {string} instructions.processing - Filter criteria (optional - defaults based on scale midpoint)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scaleSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function filterInstructions(instructions, config = {}, createSpec = scaleSpec) {
  const { scaling, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scaling, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'filter-criteria' })}

${FILTER_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FILTER_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create reduce instructions for scaling
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scaling - How to scale each item
 * @param {string} instructions.processing - How to reduce the scaled values
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scaleSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function reduceInstructions(instructions, config = {}, createSpec = scaleSpec) {
  const { scaling, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scaling, specConfig);

  const combinedInstructions = `${asXML(processing, { tag: 'reduce-operation' })}

${REDUCE_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create find instructions for scaling
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scaling - How to scale each item
 * @param {string} instructions.processing - Selection criteria (optional - defaults to upper quartile)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scaleSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function findInstructions(instructions, config = {}, createSpec = scaleSpec) {
  const { scaling, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scaling, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'selection-criteria' })}

${FIND_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FIND_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create group instructions for scaling
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scaling - How to scale each item
 * @param {string} instructions.processing - Grouping strategy (optional - defaults to ranges)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scaleSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function groupInstructions(instructions, config = {}, createSpec = scaleSpec) {
  const { scaling, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scaling, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'grouping-strategy' })}

${GROUP_PROCESS_STEPS}

${asXML(specification, { tag: 'scale-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_GROUP_INSTRUCTIONS}

${asXML(specification, { tag: 'scale-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
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
