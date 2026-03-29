import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import buildInstructions from '../../lib/build-instructions/index.js';
import { scaleSpecificationJsonSchema } from './schemas.js';
import scaleResultSchema from './scale-result.json';
import createProgressEmitter from '../../lib/progress/index.js';
import { nameStep } from '../../lib/context/option.js';

// ===== Instruction Builders =====

export const {
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = buildInstructions({
  specTag: 'scale-specification',
  defaults: {
    map: `Apply the scale to each item and return only the transformed value.`,
    filter: `Keep items whose scaled values fall in the upper half of the scale's range.\n\nNote: This evaluates against the scale's defined range, not the batch's actual distribution.`,
    find: `Select an item whose scaled value falls in the upper quartile of the scale's range.\n\nNote: This evaluates against the scale's defined range, not the global maximum across all batches.`,
    group: `Group items based on natural divisions in the scale's range (e.g., low/medium/high).`,
  },
  steps: {
    reduce: `Transform each item with the scale, then apply the reduce operation to accumulate the results.`,
    filter: `Apply the scale to determine which items meet the filter criteria.`,
    find: `Use the scale to identify and return the item that best matches the selection criteria.`,
    group: `Apply the scale to determine each item's group assignment.`,
  },
  mapApplyLine: 'Apply this scale to transform each item:',
});

// ===== Core Functions =====

/**
 * Generate a scale specification from instructions
 * @param {string} prompt - Natural language scaling instructions
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<Object>} Scale specification with domain, range, and mapping
 */
export async function scaleSpec(prompt, config = {}) {
  const runConfig = nameStep('scale:spec', config);
  const specEmitter = createProgressEmitter('scale:spec', runConfig.onProgress, runConfig);
  specEmitter.start({ message: 'Scale spec generation starting' });

  const specSystemPrompt = `You are a scale specification generator. Analyze the scaling instructions and produce a clear, comprehensive specification.`;

  const specUserPrompt = `Analyze these scaling instructions and generate a scale specification.

${asXML(prompt, { tag: 'scaling-instructions' })}

Provide a JSON object with exactly three string properties:
- domain: A single string describing expected input types, formats, and valid ranges
- range: A single string describing output types, formats, and possible values
- mapping: A single string with clear description of how inputs map to outputs, including any formulas, rules, edge cases, and examples

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        ...runConfig,
        systemPrompt: specSystemPrompt,
        response_format: jsonSchema(
          scaleSpecificationJsonSchema.name,
          scaleSpecificationJsonSchema.schema
        ),
      }),
    {
      label: 'scale spec',
      config: runConfig,
    }
  );

  specEmitter.complete({ message: 'Scale spec generation complete' });

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
  const runConfig = nameStep('scale:apply', config);

  const prompt = `Apply the scale specification to transform this item.

${asXML(specification, { tag: 'scale-specification' })}

${asXML(item, { tag: 'item' })}

Transform this item according to the specification.
Return a JSON object with a "value" property containing the scaled result.`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        response_format: jsonSchema('scale_result', scaleResultSchema),
      }),
    {
      label: 'scale item',
      config: runConfig,
    }
  );

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
