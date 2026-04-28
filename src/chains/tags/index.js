import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import map from '../map/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import tagsResultSchema from './tags-result.json' with { type: 'json' };

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
  const runConfig = nameStep('tags:spec', config);
  const emitter = createProgressEmitter('tags:spec', runConfig.onProgress, runConfig);
  emitter.start();

  try {
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
          ...runConfig,
          systemPrompt: specSystemPrompt,
        }),
      {
        label: 'tags-spec',
        config: runConfig,
      }
    );

    if (typeof response !== 'string' || response.length === 0) {
      throw new Error(`tags: expected non-empty string from spec LLM (got ${typeof response})`);
    }

    emitter.complete({ outcome: Outcome.success });
    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

/**
 * Apply tag specification and vocabulary to assign tags to an item
 * @param {*} item - Item to tag
 * @param {string} specification - Pre-generated tag specification
 * @param {Object} vocabulary - Tag vocabulary to use
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of tag IDs
 */
async function tagWithSpec(item, spec, vocabulary, config = {}) {
  if (!vocabulary || !Array.isArray(vocabulary.tags)) {
    throw new Error(
      'tags: vocabulary with a tags array is required (pass via instruction bundle or config)'
    );
  }

  const runConfig = nameStep(`${name}:apply`, config);
  const applyEmitter = createProgressEmitter(`${name}:apply`, runConfig.onProgress, runConfig);
  applyEmitter.start();

  try {
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

${asXML(spec, { tag: 'tag-specification' })}

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
          responseFormat: jsonSchema('tags_result', tagsResultSchema),
        }),
      {
        label: 'tags-apply',
        config: runConfig,
      }
    );

    // llm auto-unwraps {items: [...]} to just the array
    if (!Array.isArray(response)) {
      throw new Error(`tags: expected tag-id array from apply LLM (got ${typeof response})`);
    }

    applyEmitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    applyEmitter.error(err);
    throw err;
  }
}

const KNOWN_KEYS = ['spec', 'vocabulary', 'vocabularyMode'];

/**
 * Tag a single item
 * @param {*} item - Item to tag
 * @param {string|object} instructions - Tagging instructions (string or bundle with vocabulary, spec)
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of tag IDs
 */
export default async function tagItem(item, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, KNOWN_KEYS);
  const { text, known, context } = resolveTexts(instructions, KNOWN_KEYS);
  const vocabulary = known.vocabulary;
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;
  const spec = known.spec || (await tagSpec(effectiveInstructions, config));
  // vocabularyMode from the bundle must flow into the config tagWithSpec reads
  // via getOptions. Without this hop, bundle-provided "open" was silently
  // overridden by the strict default.
  const downstreamConfig =
    known.vocabularyMode !== undefined
      ? { ...config, vocabularyMode: known.vocabularyMode }
      : config;
  return tagWithSpec(item, spec, vocabulary, downstreamConfig);
}

/**
 * Tag a list of items
 * @param {Array} list - Array of items to tag
 * @param {string|object} instructions - Tagging instructions (string or bundle with vocabulary, spec)
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of tag arrays
 */
export async function mapTags(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, KNOWN_KEYS);
  const runConfig = nameStep('tags:map', config);
  const emitter = createProgressEmitter('tags:map', runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { text, known, context } = resolveTexts(instructions, KNOWN_KEYS);
    const vocabulary = known.vocabulary;
    if (!vocabulary || !Array.isArray(vocabulary.tags)) {
      throw new Error(
        'tags: vocabulary with a tags array is required (pass via instruction bundle or config)'
      );
    }
    const vocabularyMode =
      known.vocabularyMode ??
      (await getOptions(runConfig, { vocabularyMode: 'strict' })).vocabularyMode;
    const effectiveInstructions = context ? `${text}\n\n${context}` : text;
    const spec = known.spec || (await tagSpec(effectiveInstructions, runConfig));
    emitter.emit({ event: DomainEvent.phase, phase: 'applying-tags', specification: spec });
    const mapInstr = buildTaggingInstructions(
      spec,
      vocabulary,
      `For each item, return an array of tag IDs that apply according to the specification.
Return only IDs from the available tags list.
Return empty array when no tags apply.`,
      vocabularyMode
    );

    // Ensure items are properly serialized for the map chain
    // The map chain converts items to strings, so we need to handle objects specially
    const serializedList = list.map((item) =>
      typeof item === 'object' && item !== null ? JSON.stringify(item) : item
    );

    const batchDone = emitter.batch(serializedList.length);

    // Configure map to use our structured schema for tag arrays
    const mapConfig = {
      ...runConfig,
      responseFormat: jsonSchema('tags_map_result', tagsMapSchema),
      onProgress: scopePhase(runConfig.onProgress, 'tags:map'),
    };

    // Map will return array of tag arrays directly
    const results = await map(serializedList, mapInstr, mapConfig);
    batchDone(serializedList.length);

    if (!Array.isArray(results)) {
      throw new Error(`tags: expected array of tag arrays from map (got ${typeof results})`);
    }

    // Total-failure detection: every entry malformed (not an array).
    // Count valid (array-shaped) entries — empty arrays count as success
    // (no tags applied is a legitimate result).
    if (results.length > 0) {
      const validCount = results.filter((r) => Array.isArray(r)).length;
      if (validCount === 0) {
        throw new Error(`tags: all ${results.length} items returned malformed tag arrays`);
      }
    }

    emitter.complete({ outcome: Outcome.success });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

// ===== Instruction Builder =====

/**
 * Build tagging instructions with specification and vocabulary.
 * Internal — used by mapTags and tagInstructions.
 */
function buildTaggingInstructions(
  spec,
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

${asXML(spec, { tag: 'tag-specification' })}

${vocabularyConstraint}`;

  return additionalInstructions ? `${base}\n\n${additionalInstructions}` : base;
}

/**
 * Build an instruction bundle for tagging, usable with any collection chain.
 *
 * Tags require a vocabulary in addition to a spec, so the bundle includes it.
 *
 * @param {object} params
 * @param {string} params.spec - Pre-generated tag specification
 * @param {object} params.vocabulary - Tag vocabulary to use
 * @param {string} [params.vocabularyMode='strict'] - 'strict' or 'open'
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, vocabulary, ...context }
 */
export function tagInstructions({ spec, vocabulary, vocabularyMode = 'strict', text, ...context }) {
  return {
    text: text ?? 'Assign tags from the vocabulary to each item according to the tag specification',
    spec,
    vocabulary,
    vocabularyMode,
    ...context,
  };
}

tagItem.knownTexts = KNOWN_KEYS;
mapTags.knownTexts = KNOWN_KEYS;
