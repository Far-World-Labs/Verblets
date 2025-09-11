import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import map from '../map/index.js';
import tagsResultSchema from './tags-result.json';

const { onlyJSON } = promptConstants;

// Schema for map operation - array of tag arrays
const tagsMapSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'array',
        description: 'Array of tag IDs for this item',
        items: {
          type: 'string',
          description: 'Tag identifier from the vocabulary',
        },
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

// ===== Core Functions =====

/**
 * Generate tag specification from instructions
 * @param {string} instructions - Natural language tagging instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Tag specification
 */
export async function tagSpec(instructions, config = {}) {
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...rest } = config;

  const specSystemPrompt = `You are a tag specification generator. Create clear, actionable tagging criteria.`;

  const specUserPrompt = `Analyze these tagging instructions and generate a specification.

${asXML(instructions, { tag: 'tagging-instructions' })}

Provide a clear specification describing:
- What aspects to look for when tagging
- How to determine which tags apply
- Rules for tag assignment (single vs multiple, required vs optional)
- Any special considerations

Keep it concise and actionable.`;

  const response = await retry(chatGPT, {
    label: 'tags-spec',
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
    logger: rest.logger,
  });

  return response;
}

/**
 * Apply tag specification and vocabulary to assign tags to an item
 * @param {*} item - Item to tag
 * @param {string} specification - Pre-generated tag specification
 * @param {Object} vocabulary - Tag vocabulary to use
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of tag IDs
 */
export async function applyTags(item, specification, vocabulary, config = {}) {
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...options } = config;

  const prompt = `You are a tagger. Apply tags to the given item based on the specification.

${asXML(specification, { tag: 'tag-specification' })}

Available tags (you MUST use only the "id" field from these tags):
${asXML(JSON.stringify(vocabulary.tags), { tag: 'available-tags' })}

Item to tag:
${asXML(JSON.stringify(item), { tag: 'item-to-tag' })}

Analyze the item and determine which tags apply based on the specification.
Return a JSON object with an "items" array containing ONLY the tag IDs (the "id" field values from available-tags).
Do NOT return tag labels, descriptions, or full tag objects - ONLY the string ID values.

${onlyJSON}`;

  const response = await retry(chatGPT, {
    label: 'tags-apply',
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
            name: 'tags_result',
            schema: tagsResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
    logger: options.logger,
  });

  // chatGPT auto-unwraps {items: [...]} to just the array
  return Array.isArray(response) ? response : [];
}

/**
 * Tag a single item
 * @param {*} item - Item to tag
 * @param {string} instructions - Natural language tagging instructions
 * @param {Object} vocabulary - Tag vocabulary to use
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of tag IDs
 */
export async function tagItem(item, instructions, vocabulary, config = {}) {
  const { now = new Date(), ...restConfig } = config;
  const spec = await tagSpec(instructions, { now, ...restConfig });
  return await applyTags(item, spec, vocabulary, { now, ...restConfig });
}

/**
 * Tag a list of items
 * @param {Array} list - Array of items to tag
 * @param {string} instructions - Natural language tagging instructions
 * @param {Object} vocabulary - Tag vocabulary to use
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of tag arrays
 */
export async function mapTags(list, instructions, vocabulary, config = {}) {
  const { now = new Date(), ...restConfig } = config;
  const spec = await tagSpec(instructions, { now, ...restConfig });
  const mapInstr = mapInstructions({ specification: spec, vocabulary });

  // Ensure items are properly serialized for the map chain
  // The map chain converts items to strings, so we need to handle objects specially
  const serializedList = list.map((item) =>
    typeof item === 'object' && item !== null ? JSON.stringify(item) : item
  );

  // Configure map to use our structured schema for tag arrays
  const mapConfig = {
    ...restConfig,
    now,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: 'tags_map_result',
        schema: tagsMapSchema,
      },
    },
  };

  // Map will return array of tag arrays directly
  const results = await map(serializedList, mapInstr, mapConfig);

  return results;
}

// ===== Instruction Builders =====

/**
 * Build tagging instructions with specification and vocabulary
 * @param {string} specification - The tag specification
 * @param {Object} vocabulary - The tag vocabulary
 * @param {string} additionalInstructions - Additional instructions for specific operation
 * @returns {string} Complete instruction string
 */
function buildTaggingInstructions(specification, vocabulary, additionalInstructions = '') {
  const base = `Apply this tag specification to evaluate each item:

${asXML(specification, { tag: 'tag-specification' })}

Available tags (use ONLY the "id" field values):
${asXML(JSON.stringify(vocabulary.tags), { tag: 'available-tags' })}

CRITICAL: Return ONLY the string ID values from the tags above.
Do NOT return labels, descriptions, or tag objects - just the ID strings.`;

  return additionalInstructions ? `${base}\n\n${additionalInstructions}` : base;
}

/**
 * Create map instructions for tagging
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated tag specification
 * @param {Object} params.vocabulary - Tag vocabulary to use
 * @param {string} params.processing - Additional processing instructions (optional)
 * @returns {string} Instructions string
 */
export function mapInstructions({ specification, vocabulary, processing }) {
  const additionalInstructions =
    processing ||
    `For each item, return an array of tag IDs that apply according to the specification.
Return only IDs from the available tags list.
Return empty array when no tags apply.`;

  return buildTaggingInstructions(specification, vocabulary, additionalInstructions);
}

/**
 * Create filter instructions for tagging
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated tag specification
 * @param {Object} params.vocabulary - Tag vocabulary to use
 * @param {string} params.processing - Filter criteria (e.g., "items with financial tags")
 * @returns {string} Instructions string
 */
export function filterInstructions({ specification, vocabulary, processing }) {
  if (!processing) {
    throw new Error('Filter processing criteria must be provided');
  }

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing, { tag: 'filter-criteria' })}

First tag the item, then determine if it matches the filter criteria based on its tags.`
  );
}

/**
 * Create reduce instructions for tagging
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated tag specification
 * @param {Object} params.vocabulary - Tag vocabulary to use
 * @param {string} params.processing - How to reduce tagged items
 * @returns {string} Instructions string
 */
export function reduceInstructions({ specification, vocabulary, processing }) {
  const defaultProcessing = `Build a unified tag frequency map across all items`;

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing || defaultProcessing, { tag: 'reduce-operation' })}

Tag each item and use the tags in the reduction operation.`
  );
}

/**
 * Create find instructions for tagging
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated tag specification
 * @param {Object} params.vocabulary - Tag vocabulary to use
 * @param {string} params.processing - Selection criteria (e.g., "item with most diverse tags")
 * @returns {string} Instructions string
 */
export function findInstructions({ specification, vocabulary, processing }) {
  if (!processing) {
    throw new Error('Find selection criteria must be provided');
  }

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing, { tag: 'selection-criteria' })}

Tag each item and use the tags to determine which item to select.`
  );
}

/**
 * Create group instructions for tagging
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated tag specification
 * @param {Object} params.vocabulary - Tag vocabulary to use
 * @param {string} params.processing - Grouping strategy (e.g., "group by primary tag")
 * @returns {string} Instructions string
 */
export function groupInstructions({ specification, vocabulary, processing }) {
  const defaultProcessing = `Group items by their primary (first) tag`;

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing || defaultProcessing, { tag: 'grouping-strategy' })}

Tag each item and use the tags to determine grouping.`
  );
}

// ===== Advanced Functions =====

/**
 * Create a tag extractor with pre-generated specification and vocabulary
 * @param {string} specification - Pre-generated tag specification
 * @param {Object} vocabulary - Tag vocabulary to use
 * @param {Object} config - Configuration options
 * @returns {Function} Tag extraction function with specification and vocabulary properties
 */
export function createTagExtractor(specification, vocabulary, config = {}) {
  const extractorFunction = async function (input) {
    return await applyTags(input, specification, vocabulary, config);
  };

  // Add properties for introspection
  Object.defineProperty(extractorFunction, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  Object.defineProperty(extractorFunction, 'vocabulary', {
    get() {
      return vocabulary;
    },
    enumerable: true,
  });

  return extractorFunction;
}

/**
 * Create a configured tagger function bound to a vocabulary
 * @param {Object} vocabulary - Tag vocabulary to use
 * @param {Object} config - Configuration options
 * @returns {Function} Configured tagger function
 */
export function createTagger(vocabulary, config = {}) {
  const taggerFunction = async function (items, instructions) {
    // Handle both single items and arrays
    if (Array.isArray(items)) {
      return await mapTags(items, instructions, vocabulary, config);
    }
    return await tagItem(items, instructions, vocabulary, config);
  };

  // Add vocabulary property for introspection
  Object.defineProperty(taggerFunction, 'vocabulary', {
    get() {
      return vocabulary;
    },
    enumerable: true,
  });

  // Expose map operation specifically for tag-vocabulary chain
  taggerFunction.mapWithVocabulary = async function (list, overrideVocabulary) {
    const vocabToUse = overrideVocabulary || vocabulary;
    // Default instructions when used by tag-vocabulary
    const defaultInstructions = 'Assign all applicable tags based on the item content';
    return await mapTags(list, defaultInstructions, vocabToUse, config);
  };

  return taggerFunction;
}

/**
 * Default export - stateless tagging function
 * Requires vocabulary to be passed with each call
 * @param {string} instructions - Natural language tagging instructions
 * @param {Object} config - Configuration options
 * @returns {Function} Stateless tagger function
 */
export default function tags(instructions, config = {}) {
  const taggerFunction = async function (items, vocabulary) {
    if (!vocabulary) {
      throw new Error('Vocabulary must be provided as second argument');
    }

    // Handle both single items and arrays
    if (Array.isArray(items)) {
      return await mapTags(items, instructions, vocabulary, config);
    }
    return await tagItem(items, instructions, vocabulary, config);
  };

  Object.defineProperty(taggerFunction, 'instructions', {
    get() {
      return instructions;
    },
    enumerable: true,
  });

  return taggerFunction;
}
