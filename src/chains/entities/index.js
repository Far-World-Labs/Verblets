import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallel from '../../lib/parallel-batch/index.js';
import map from '../map/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import entityResultSchema from './entity-result.json' with { type: 'json' };
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { expectArray, expectObject, expectString } from '../../lib/expect-shape/index.js';

const entitiesBatchSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: entityResultSchema,
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const entitiesBatchResponseFormat = jsonSchema('entities_batch', entitiesBatchSchema);

const name = 'entities';

// ===== Instruction Builder =====

/**
 * Build an instruction bundle for entity extraction, usable with any collection chain.
 *
 * @param {object} params
 * @param {string} params.spec - Pre-generated entity specification
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, ...context }
 */
export function entityInstructions({ spec, text, ...context }) {
  return {
    text: text ?? 'Extract entities according to the entity specification',
    spec,
    ...context,
  };
}

// ===== Core Functions =====

/**
 * Generate an entity specification from instructions
 * @param {string} prompt - Natural language entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Entity specification as descriptive text
 */
export async function entitySpec(prompt, config = {}) {
  const runConfig = nameStep('entities:spec', config);

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
        ...runConfig,
        systemPrompt: specSystemPrompt,
      }),
    {
      label: 'entities-spec',
      config: runConfig,
    }
  );

  return expectString(response, { chain: 'entities', expected: 'spec from LLM' });
}

/**
 * Apply entity specification to extract entities from text
 * @param {string} text - Text to extract entities from
 * @param {string} specification - Pre-generated entity specification
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Object with entities array
 */
async function extractWithSpec(text, spec, config = {}) {
  const runConfig = nameStep('entities:apply', config);

  const prompt = `Apply the entity specification to extract entities from this text.

${asXML(spec, { tag: 'entity-specification' })}

${asXML(text, { tag: 'text' })}

Extract entities according to the specification. Return a JSON object with an "entities" array where each element has exactly two properties:
- "name" (string): The entity name or text as it appears in the source
- "type" (string): The category of entity (e.g. person, company, location, date, concept)

Include every entity that matches the specification. Do not add properties beyond "name" and "type".`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: jsonSchema('entity_result', entityResultSchema),
      }),
    {
      label: 'entities-apply',
      config: runConfig,
    }
  );

  expectObject(response, { chain: 'entities', expected: 'object from extraction LLM' });
  expectArray(response.entities, {
    chain: 'entities',
    expected: 'entities array from extraction LLM',
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
export default async function extractEntities(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text: instructionText, known, context } = resolveTexts(instructions, ['spec']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({
      event: DomainEvent.step,
      stepName: 'generating-specification',
      instructions: instructionText,
    });

    const spec =
      known.spec ||
      (await entitySpec(context ? `${instructionText}\n\n${context}` : instructionText, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'spec'),
      }));

    emitter.emit({ event: DomainEvent.step, stepName: 'extracting-entities', specification: spec });

    const result = await extractWithSpec(text, spec, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'apply'),
    });

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

extractEntities.knownTexts = ['spec'];

/**
 * Extract entities from each text in a list, sharing one spec across all calls.
 *
 * The spec is generated once (skipped when supplied via the instruction
 * bundle) and reused for every per-text extraction. Per-text dispatch is
 * parallel because the per-call output is a structured object that doesn't
 * compress well into a batched array-of-objects schema. Per-text failures
 * leave that slot as `undefined` rather than throwing — matching the
 * partial-outcome contract used by `mapScore`/`mapTags`.
 *
 * @param {string[]} texts - Source texts to extract entities from
 * @param {string|object} instructions - Extraction instructions (string or bundle with `spec`)
 * @param {object} [config={}] - Configuration options (`maxParallel`, `errorPosture`)
 * @returns {Promise<Array<{entities: Array}|undefined>>}
 */
export async function mapEntities(texts, instructions, config) {
  if (!Array.isArray(texts)) {
    throw new Error(
      `mapEntities: texts must be an array (got ${texts === null ? 'null' : typeof texts})`
    );
  }
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text: instructionText, known, context } = resolveTexts(instructions, ['spec']);
  const effectiveInstructions = context ? `${instructionText}\n\n${context}` : instructionText;

  const runConfig = nameStep('entities:map', config);
  const emitter = createProgressEmitter('entities:map', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: texts });

  try {
    const { maxParallel, errorPosture } = await getOptions(runConfig, {
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });

    const spec =
      known.spec ||
      (await entitySpec(effectiveInstructions, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'spec'),
      }));

    emitter.emit({ event: DomainEvent.phase, phase: 'extracting-entities', specification: spec });
    const batchDone = emitter.batch(texts.length);

    const results = new Array(texts.length).fill(undefined);
    const items = texts.map((source, index) => ({ source, index }));

    await parallel(
      items,
      async ({ source, index }) => {
        try {
          results[index] = await extractWithSpec(source, spec, {
            ...runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'apply'),
          });
        } catch (error) {
          emitter.error(error, { itemIndex: index });
          if (errorPosture === ErrorPosture.strict) throw error;
        } finally {
          batchDone(1);
        }
      },
      {
        maxParallel,
        errorPosture,
        label: 'entities items',
        abortSignal: runConfig.abortSignal,
      }
    );

    const failedItems = results.filter((r) => r === undefined).length;
    if (failedItems === results.length && results.length > 0) {
      throw new Error(`entities: all ${results.length} texts failed to extract`);
    }

    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({
      totalItems: results.length,
      successCount: results.length - failedItems,
      failedItems,
      outcome,
    });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

mapEntities.knownTexts = ['spec'];

/**
 * Extract entities from each text by packing texts into batched LLM prompts
 * (one call per batch). Sister to `mapEntities`, which dispatches per-text
 * in parallel — use the batched form to amortize per-call overhead when
 * texts are short and homogeneous enough that the LLM can handle them in
 * one prompt without smearing entity types across documents.
 *
 * @param {string[]} texts - Source texts to extract entities from
 * @param {string|object} instructions - Extraction instructions
 * @param {object} [config={}] - `batchSize`, `maxParallel`, `errorPosture`
 * @returns {Promise<Array<{entities: Array}|undefined>>}
 */
export async function mapEntitiesBatched(texts, instructions, config) {
  if (!Array.isArray(texts)) {
    throw new Error(
      `mapEntitiesBatched: texts must be an array (got ${texts === null ? 'null' : typeof texts})`
    );
  }
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text: instructionText, known, context } = resolveTexts(instructions, ['spec']);
  const effectiveInstructions = context ? `${instructionText}\n\n${context}` : instructionText;

  const runConfig = nameStep('entities:batched', config);
  const emitter = createProgressEmitter('entities:batched', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: texts });

  try {
    const spec =
      known.spec ||
      (await entitySpec(effectiveInstructions, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'spec'),
      }));

    emitter.emit({ event: DomainEvent.phase, phase: 'extracting-entities', specification: spec });

    const mapInstructions = `Apply the entity specification to each input text and extract entities for every one.

${asXML(spec, { tag: 'entity-specification' })}

For each text, return an object with an "entities" array. Every entity has exactly:
- "name" (string): The entity name or text as it appears in the source
- "type" (string): The category (e.g. person, company, location, date, concept)

Return one entities object per input text, in the same order. Use an empty entities array when the text contains nothing matching the specification.`;

    const results = await map(texts, mapInstructions, {
      ...runConfig,
      responseFormat: entitiesBatchResponseFormat,
      onProgress: scopePhase(runConfig.onProgress, 'entities:map'),
    });

    if (!Array.isArray(results)) {
      throw new Error(`entities: expected array of results from map (got ${typeof results})`);
    }

    const failedItems = results.filter((r) => r === undefined).length;
    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    emitter.complete({
      totalItems: results.length,
      successCount: results.length - failedItems,
      failedItems,
      outcome,
    });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

mapEntitiesBatched.knownTexts = ['spec'];
