import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import entityResultSchema from './entity-result.json';

const { onlyJSON } = promptConstants;

// ===== Default Instructions =====

const DEFAULT_MAP_INSTRUCTIONS = `Extract entities from each text chunk.`;

const DEFAULT_FILTER_INSTRUCTIONS = `Extract entities and keep only those matching the criteria.`;

const DEFAULT_FIND_INSTRUCTIONS = `Extract entities and select the most significant one.`;

const DEFAULT_GROUP_INSTRUCTIONS = `Group entities by their types, themes, or co-occurrence patterns.`;

const REDUCE_PROCESS_STEPS = `Consolidate entities across text chunks:
1. Merge duplicates - same entity mentioned in different chunks
2. Resolve variations - "Apple Inc." and "Apple" may be the same
3. Build unified list - all unique entities discovered`;

const FILTER_PROCESS_STEPS = `Extract entities and filter to keep only those meeting the criteria.`;

const FIND_PROCESS_STEPS = `Extract entities and return the one best matching the selection criteria.`;

const GROUP_PROCESS_STEPS = `Extract entities and group them by patterns, types, or relationships.`;

// ===== Core Functions =====

/**
 * Generate an entity specification from instructions
 * @param {string} prompt - Natural language entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Entity specification as descriptive text
 */
export async function entitySpec(prompt, config = {}) {
  const { llm, ...rest } = config;

  const specSystemPrompt = `You are an entity specification generator. Create a clear, concise specification for entity extraction.`;

  const specUserPrompt = `Analyze these entity extraction instructions and generate a specification.

${asXML(prompt, { tag: 'entity-instructions' })}

Provide a brief specification describing:
- What types of entities to extract
- Any specific rules or constraints
- How to handle edge cases

Keep it simple and actionable.`;

  const response = await chatGPT(specUserPrompt, {
    llm,
    system: specSystemPrompt,
    ...rest,
  });

  return response;
}

/**
 * Apply entity specification to extract entities from text
 * @param {string} text - Text to extract entities from
 * @param {string} specification - Pre-generated entity specification
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Object with entities array
 */
export async function applyEntities(text, specification, config = {}) {
  const { llm, ...options } = config;

  const prompt = `Apply the entity specification to extract entities from this text.

${asXML(specification, { tag: 'entity-specification' })}

${asXML(text, { tag: 'text' })}

Extract entities according to the specification.
Return a JSON object with an "entities" array.
Each entity should include:
- name: The entity name
- type: What kind of entity (if relevant)

${onlyJSON}`;

  const response = await chatGPT(prompt, {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'entity_result',
          schema: entityResultSchema,
        },
      },
    },
    llm,
    ...options,
  });

  return response;
}

/**
 * Extract entities from a single text
 * @param {string} text - Text to extract entities from
 * @param {string} instructions - Entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Object with entities array
 */
export async function extractEntities(text, instructions, config = {}) {
  const spec = await entitySpec(instructions, config);
  return await applyEntities(text, spec, config);
}

// ===== Instruction Builders =====

/**
 * Helper to create instruction with attached specification
 * @param {string} instructions - The instruction string
 * @param {string} specification - The specification text
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
 * Create map instructions for entity extraction
 * @param {string|Object} instructions - Entity extraction string or instructions object
 * @param {string} instructions.entities - What entities to extract
 * @param {string} instructions.processing - Additional processing instructions (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to entitySpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function mapInstructions(instructions, config = {}, createSpec = entitySpec) {
  // Handle backward compatibility - if instructions is a string, use it as entities
  const entities = typeof instructions === 'string' ? instructions : instructions.entities;
  const processing = typeof instructions === 'object' ? instructions.processing : null;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(entities, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'processing-instructions' })}

Apply this entity specification:
${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_MAP_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create filter instructions for entity extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.entities - What entities to extract
 * @param {string} instructions.processing - Filter criteria (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to entitySpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function filterInstructions(instructions, config = {}, createSpec = entitySpec) {
  const { entities, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(entities, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'filter-criteria' })}

${FILTER_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FILTER_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create reduce instructions for entity extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.entities - What entities to extract
 * @param {string} instructions.processing - How to consolidate entities (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to entitySpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function reduceInstructions(instructions, config = {}, createSpec = entitySpec) {
  const { entities, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(entities, specConfig);

  const defaultProcessing = `Build comprehensive entity list from all chunks`;

  const combinedInstructions = `${asXML(processing || defaultProcessing, {
    tag: 'reduce-operation',
  })}

${REDUCE_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create find instructions for entity extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.entities - What entities to extract
 * @param {string} instructions.processing - Selection criteria (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to entitySpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function findInstructions(instructions, config = {}, createSpec = entitySpec) {
  const { entities, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(entities, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'selection-criteria' })}

${FIND_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FIND_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create group instructions for entity extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.entities - What entities to extract
 * @param {string} instructions.processing - Grouping strategy (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to entitySpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function groupInstructions(instructions, config = {}, createSpec = entitySpec) {
  const { entities, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(entities, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'grouping-strategy' })}

${GROUP_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_GROUP_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

// ===== Advanced Entity Functions =====

/**
 * Create an entity extraction function with a pre-generated specification
 * @param {string} specification - Pre-generated entity specification
 * @param {Object} config - Configuration options
 * @returns {Function} Entity extraction function with specification property
 */
export function createEntityExtractor(specification, config = {}) {
  const extractorFunction = async function (input) {
    return await applyEntities(input, specification, config);
  };

  // Add specification property for introspection
  Object.defineProperty(extractorFunction, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  return extractorFunction;
}

/**
 * Original entity extraction function - simple, stateless version
 * @param {string} prompt - Entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Function} Entity extraction function
 */
export default function entities(prompt, config = {}) {
  const extractorFunction = async function (input) {
    return await extractEntities(input, prompt, config);
  };

  Object.defineProperty(extractorFunction, 'prompt', {
    get() {
      return prompt;
    },
    enumerable: true,
  });

  return extractorFunction;
}
