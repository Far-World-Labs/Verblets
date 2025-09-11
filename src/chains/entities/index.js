import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import entityResultSchema from './entity-result.json';
import { emitStepProgress } from '../../lib/progress-callback/index.js';

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
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...rest } = config;

  const specSystemPrompt = `You are an entity specification generator. Create a clear, concise specification for entity extraction.`;

  const specUserPrompt = `Analyze these entity extraction instructions and generate a specification.

${asXML(prompt, { tag: 'entity-instructions' })}

Provide a brief specification describing:
- What types of entities to extract
- Any specific rules or constraints
- How to handle edge cases

Keep it simple and actionable.`;

  const response = await retry(chatGPT, {
    label: 'entities-spec',
    maxAttempts,
    onProgress,
    now,
    chainStartTime: now,
    chatGPTPrompt: specUserPrompt,
    chatGPTConfig: {
      llm,
      system: specSystemPrompt,
      ...rest,
    },
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
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...options } = config;

  const prompt = `Apply the entity specification to extract entities from this text.

${asXML(specification, { tag: 'entity-specification' })}

${asXML(text, { tag: 'text' })}

Extract entities according to the specification.
Return a JSON object with an "entities" array.
Each entity should include:
- name: The entity name
- type: What kind of entity (if relevant)

${onlyJSON}`;

  const response = await retry(chatGPT, {
    label: 'entities-apply',
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
            name: 'entity_result',
            schema: entityResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
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
  const { onProgress, now = new Date(), ...restConfig } = config;

  emitStepProgress(onProgress, 'entities', 'generating-specification', {
    instructions,
    now: new Date(),
    chainStartTime: now,
  });

  const spec = await entitySpec(instructions, { onProgress, now, ...restConfig });

  emitStepProgress(onProgress, 'entities', 'extracting-entities', {
    specification: spec,
    now: new Date(),
    chainStartTime: now,
  });

  return await applyEntities(text, spec, { onProgress, now, ...restConfig });
}

// ===== Instruction Builders =====

/**
 * Create map instructions for entity extraction
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated entity specification
 * @param {string} params.processing - Additional processing instructions (optional)
 * @returns {string} Instructions string
 */
export function mapInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'processing-instructions' })}

Apply this entity specification:
${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    return `${DEFAULT_MAP_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }
}

/**
 * Create filter instructions for entity extraction
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated entity specification
 * @param {string} params.processing - Filter criteria (optional)
 * @returns {string} Instructions string
 */
export function filterInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'filter-criteria' })}

${FILTER_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    return `${DEFAULT_FILTER_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }
}

/**
 * Create reduce instructions for entity extraction
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated entity specification
 * @param {string} params.processing - How to consolidate entities (optional)
 * @returns {string} Instructions string
 */
export function reduceInstructions({ specification, processing }) {
  const defaultProcessing = `Build comprehensive entity list from all chunks`;

  return `${asXML(processing || defaultProcessing, {
    tag: 'reduce-operation',
  })}

${REDUCE_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
}

/**
 * Create find instructions for entity extraction
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated entity specification
 * @param {string} params.processing - Selection criteria (optional)
 * @returns {string} Instructions string
 */
export function findInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'selection-criteria' })}

${FIND_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    return `${DEFAULT_FIND_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }
}

/**
 * Create group instructions for entity extraction
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated entity specification
 * @param {string} params.processing - Grouping strategy (optional)
 * @returns {string} Instructions string
 */
export function groupInstructions({ specification, processing }) {
  if (processing) {
    return `${asXML(processing, { tag: 'grouping-strategy' })}

${GROUP_PROCESS_STEPS}

${asXML(specification, { tag: 'entity-specification' })}`;
  } else {
    return `${DEFAULT_GROUP_INSTRUCTIONS}

${asXML(specification, { tag: 'entity-specification' })}`;
  }
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
