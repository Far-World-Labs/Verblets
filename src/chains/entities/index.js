import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import buildInstructions from '../../lib/build-instructions/index.js';
import entityResultSchema from './entity-result.json';
import { emitStepProgress } from '../../lib/progress-callback/index.js';

// ===== Instruction Builders =====

export const {
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = buildInstructions({
  specTag: 'entity-specification',
  defaults: {
    map: `Extract entities from each text chunk.`,
    filter: `Extract entities and keep only those matching the criteria.`,
    find: `Extract entities and select the most significant one.`,
    group: `Group entities by their types, themes, or co-occurrence patterns.`,
  },
  steps: {
    reduce: `Consolidate entities across text chunks:\n1. Merge duplicates - same entity mentioned in different chunks\n2. Resolve variations - "Apple Inc." and "Apple" may be the same\n3. Build unified list - all unique entities discovered`,
    filter: `Extract entities and filter to keep only those meeting the criteria.`,
    find: `Extract entities and return the one best matching the selection criteria.`,
    group: `Extract entities and group them by patterns, types, or relationships.`,
  },
  mapApplyLine: 'Apply this entity specification:',
  reduceDefault: 'Build comprehensive entity list from all chunks',
});

// ===== Core Functions =====

/**
 * Generate an entity specification from instructions
 * @param {string} prompt - Natural language entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Entity specification as descriptive text
 */
export async function entitySpec(prompt, config = {}) {
  const { llm, maxAttempts = 3, onProgress, abortSignal, ...rest } = config;

  const specSystemPrompt = `You are an entity specification generator. Create a clear, concise specification for entity extraction.`;

  const specUserPrompt = `Analyze these entity extraction instructions and generate a specification.

${asXML(prompt, { tag: 'entity-instructions' })}

Provide a brief specification describing:
- What types of entities to extract
- Any specific rules or constraints
- How to handle edge cases

Keep it simple and actionable.`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        llm,
        modelOptions: { systemPrompt: specSystemPrompt },
        ...rest,
      }),
    {
      label: 'entities-spec',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

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
  const { llm, maxAttempts = 3, onProgress, abortSignal, ...options } = config;

  const prompt = `Apply the entity specification to extract entities from this text.

${asXML(specification, { tag: 'entity-specification' })}

${asXML(text, { tag: 'text' })}

Extract entities according to the specification.
Return a JSON object with an "entities" array.
Each entity should include:
- name: The entity name
- type: What kind of entity (if relevant)`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        modelOptions: {
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'entity_result',
              schema: entityResultSchema,
            },
          },
        },
        ...options,
      }),
    {
      label: 'entities-apply',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

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
