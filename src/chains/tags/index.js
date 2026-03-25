import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import map from '../map/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import tagsResultSchema from './tags-result.json';

const name = 'tags';

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
  config = nameStep('tags:spec', config);

  const specSystemPrompt = `You are a tag specification generator. Create clear, actionable tagging criteria.`;

  const specUserPrompt = `Analyze these tagging instructions and generate a specification.

${asXML(instructions, { tag: 'tagging-instructions' })}

Provide a clear specification describing:
- What aspects to look for when tagging
- How to determine which tags apply
- Rules for tag assignment (single vs multiple, required vs optional)
- Any special considerations

Keep it concise and actionable.`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        ...config,
        systemPrompt: specSystemPrompt,
      }),
    {
      label: 'tags-spec',
      config,
    }
  );

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
  const runConfig = nameStep(`${name}:apply`, config);
  const applyEmitter = createProgressEmitter(`${name}:apply`, runConfig.onProgress, runConfig);
  const { vocabularyMode } = await getOptions(runConfig, {
    vocabularyMode: 'strict',
  });

  const vocabularyConstraint =
    vocabularyMode === 'open'
      ? `Available tags (prefer these, but you MAY suggest new tag IDs for items that don't fit any existing tag):
${asXML(JSON.stringify(vocabulary.tags), { tag: 'available-tags' })}`
      : `Available tags (you MUST use only the "id" field from these tags):
${asXML(JSON.stringify(vocabulary.tags), { tag: 'available-tags' })}`;

  const prompt = `You are a tagger. Apply tags to the given item based on the specification.

${asXML(specification, { tag: 'tag-specification' })}

${vocabularyConstraint}

Item to tag:
${asXML(JSON.stringify(item), { tag: 'item-to-tag' })}

Analyze the item and determine which tags apply based on the specification.
Return a JSON object with an "items" array containing ONLY the tag IDs (the "id" field values from available-tags${vocabularyMode === 'open' ? ' or new suggested IDs' : ''}).
Do NOT return tag labels, descriptions, or full tag objects - ONLY the string ID values.`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        response_format: jsonSchema('tags_result', tagsResultSchema),
      }),
    {
      label: 'tags-apply',
      config: runConfig,
    }
  );

  // llm auto-unwraps {items: [...]} to just the array
  const result = Array.isArray(response) ? response : [];

  applyEmitter.result();

  return result;
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
  const { spec: providedSpec } = config;
  const spec = providedSpec || (await tagSpec(instructions, config));
  return await applyTags(item, spec, vocabulary, config);
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
  const { spec: providedSpec, vocabularyMode: _vocabularyMode } = config;
  const vocabularyMode = _vocabularyMode || 'strict';
  const spec = providedSpec || (await tagSpec(instructions, config));
  const mapInstr = mapInstructions({ specification: spec, vocabulary, vocabularyMode });

  // Ensure items are properly serialized for the map chain
  // The map chain converts items to strings, so we need to handle objects specially
  const serializedList = list.map((item) =>
    typeof item === 'object' && item !== null ? JSON.stringify(item) : item
  );

  // Configure map to use our structured schema for tag arrays
  const mapConfig = {
    ...config,
    responseFormat: jsonSchema('tags_map_result', tagsMapSchema),
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
function buildTaggingInstructions(
  specification,
  vocabulary,
  additionalInstructions = '',
  vocabularyMode = 'strict'
) {
  const vocabularyConstraint =
    vocabularyMode === 'open'
      ? `Available tags (prefer these, but you MAY suggest new tag IDs for unmatched items):
${asXML(JSON.stringify(vocabulary.tags), { tag: 'available-tags' })}`
      : `Available tags (use ONLY the "id" field values):
${asXML(JSON.stringify(vocabulary.tags), { tag: 'available-tags' })}

CRITICAL: Return ONLY the string ID values from the tags above.
Do NOT return labels, descriptions, or tag objects - just the ID strings.`;

  const base = `Apply this tag specification to evaluate each item:

${asXML(specification, { tag: 'tag-specification' })}

${vocabularyConstraint}`;

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
export function mapInstructions({ specification, vocabulary, processing, vocabularyMode }) {
  const additionalInstructions =
    processing ||
    `For each item, return an array of tag IDs that apply according to the specification.
Return only IDs from the available tags list.
Return empty array when no tags apply.`;

  return buildTaggingInstructions(
    specification,
    vocabulary,
    additionalInstructions,
    vocabularyMode
  );
}

/**
 * Create filter instructions for tagging
 * @param {Object} params - Parameters object
 * @param {string} params.specification - Pre-generated tag specification
 * @param {Object} params.vocabulary - Tag vocabulary to use
 * @param {string} params.processing - Filter criteria (e.g., "items with financial tags")
 * @returns {string} Instructions string
 */
export function filterInstructions({ specification, vocabulary, processing, vocabularyMode }) {
  if (!processing) {
    throw new Error('Filter processing criteria must be provided');
  }

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing, { tag: 'filter-criteria' })}

First tag the item, then determine if it matches the filter criteria based on its tags.`,
    vocabularyMode
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
export function reduceInstructions({ specification, vocabulary, processing, vocabularyMode }) {
  const defaultProcessing = `Build a unified tag frequency map across all items`;

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing || defaultProcessing, { tag: 'reduce-operation' })}

Tag each item and use the tags in the reduction operation.`,
    vocabularyMode
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
export function findInstructions({ specification, vocabulary, processing, vocabularyMode }) {
  if (!processing) {
    throw new Error('Find selection criteria must be provided');
  }

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing, { tag: 'selection-criteria' })}

Tag each item and use the tags to determine which item to select.`,
    vocabularyMode
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
export function groupInstructions({ specification, vocabulary, processing, vocabularyMode }) {
  const defaultProcessing = `Group items by their primary (first) tag`;

  return buildTaggingInstructions(
    specification,
    vocabulary,
    `${asXML(processing || defaultProcessing, { tag: 'grouping-strategy' })}

Tag each item and use the tags to determine grouping.`,
    vocabularyMode
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
