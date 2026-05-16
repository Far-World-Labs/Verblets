import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallel from '../../lib/parallel-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { scaleSpecificationJsonSchema } from './schemas.js';
import scaleResultSchema from './scale-result.json' with { type: 'json' };
import map from '../map/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'scale';

const scaleBatchSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: ['number', 'string'] },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const scaleBatchResponseFormat = jsonSchema('scale_batch', scaleBatchSchema);

// ===== Instruction Builder =====

/**
 * Build an instruction bundle for scaling, usable with any collection chain.
 *
 * @param {object} params
 * @param {string|object} params.spec - Pre-generated scale specification
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, ...context }
 */
export function scaleInstructions({ spec, text, ...context }) {
  return {
    text: text ?? 'Apply the scale specification to transform each item',
    spec,
    ...context,
  };
}

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
  specEmitter.start();

  try {
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
          responseFormat: jsonSchema(
            scaleSpecificationJsonSchema.name,
            scaleSpecificationJsonSchema.schema
          ),
        }),
      {
        label: 'spec',
        config: runConfig,
      }
    );

    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      throw new Error(
        `scale: expected spec object from LLM (got ${response === null ? 'null' : typeof response})`
      );
    }
    for (const field of ['domain', 'range', 'mapping']) {
      if (typeof response[field] !== 'string') {
        throw new Error(`scale: spec.${field} must be a string (got ${typeof response[field]})`);
      }
    }

    specEmitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    specEmitter.error(err);
    throw err;
  }
}

/**
 * Apply a scale specification to a single item
 * @param {*} item - Item to scale
 * @param {Object} specification - Pre-generated scale specification
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<*>} Scaled value (type depends on specification range)
 */
async function scaleWithSpec(item, spec, config = {}) {
  const runConfig = nameStep('scale:apply', config);

  const prompt = `Apply the scale specification to transform this item.

${asXML(spec, { tag: 'scale-specification' })}

${asXML(item, { tag: 'item' })}

Transform this item according to the specification.
Return a JSON object with a "value" property containing the scaled result.`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: jsonSchema('scale_result', scaleResultSchema),
      }),
    {
      label: 'scale item',
      config: runConfig,
    }
  );

  // Schema declares value as number|string; auto-unwrap returns that value
  // directly. Anything else means the LLM violated the schema or auto-unwrap
  // didn't fire — surface the contract failure rather than propagating
  // undefined/object as the scaled result.
  if (typeof response !== 'number' && typeof response !== 'string') {
    throw new Error(
      `scale: expected number or string from apply LLM (got ${
        response === null ? 'null' : typeof response
      })`
    );
  }

  return response;
}

/**
 * Scale a single item
 * @param {*} item - Item to scale
 * @param {string} instructions - Scaling instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Scaled value
 */
export default async function scaleItem(item, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({ event: DomainEvent.step, stepName: 'generating-specification' });
    const spec =
      known.spec ||
      (await scaleSpec(context ? `${text}\n\n${context}` : text, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'scale:spec'),
      }));

    emitter.emit({ event: DomainEvent.step, stepName: 'applying-scale', specification: spec });
    const result = await scaleWithSpec(item, spec, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'scale:apply'),
    });

    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

scaleItem.knownTexts = ['spec'];

/**
 * Scale a list of items by applying a scale specification to each.
 *
 * Generates the spec once (skipped when supplied via the instruction bundle)
 * and dispatches batched per-item applications through the `map` chain.
 * Slots whose batch fails after retries return `undefined` so callers can
 * distinguish "successfully scaled" from "failed" — matching the partial-
 * outcome contract used by `mapScore`/`mapTags`.
 *
 * @param {Array} list - Items to scale; any shape (objects are stringified per item)
 * @param {string|object} instructions - Scaling instructions (string or bundle with `spec`)
 * @param {object} [config={}] - Configuration options
 * @returns {Promise<Array<number|string|undefined>>} Scaled values aligned with input order
 */
export async function mapScale(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const runConfig = nameStep('scale:map', config);
  const emitter = createProgressEmitter('scale:map', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  try {
    const effectiveInstructions = context ? `${text}\n\n${context}` : text;
    const spec =
      known.spec ||
      (await scaleSpec(effectiveInstructions, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'scale:spec'),
      }));

    emitter.emit({ event: DomainEvent.phase, phase: 'applying-scale', specification: spec });

    const mapInstructions = `Apply this scale specification to transform each item:

${asXML(spec, { tag: 'scale-specification' })}

Return one scaled value per input item according to the specification range.`;

    const serializedList = list.map((item) =>
      typeof item === 'object' && item !== null ? JSON.stringify(item) : item
    );

    const results = await map(serializedList, mapInstructions, {
      ...runConfig,
      responseFormat: scaleBatchResponseFormat,
      onProgress: scopePhase(runConfig.onProgress, 'scale:map'),
    });

    if (!Array.isArray(results)) {
      throw new Error(`scale: expected array of scaled values from map (got ${typeof results})`);
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

mapScale.knownTexts = ['spec'];

/**
 * Scale a list by running one scaleItem call per entry with managed concurrency.
 *
 * Sister to `mapScale`, which packs items into batched LLM prompts. Use the
 * parallel form when items are heterogeneous, when the batched form smears
 * domain assumptions across rows, or when you want per-item retry granularity.
 * Slots whose call fails after retries return `undefined`; chain reports
 * outcome=partial. Throws only when the whole list fails.
 *
 * @param {Array} list - Items to scale
 * @param {string|object} instructions - Scaling instructions (string or bundle with `spec`)
 * @param {object} [config={}] - `maxParallel`, `errorPosture`
 * @returns {Promise<Array<number|string|undefined>>}
 */
export async function mapScaleParallel(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  if (!Array.isArray(list)) {
    throw new Error(
      `mapScaleParallel: list must be an array (got ${list === null ? 'null' : typeof list})`
    );
  }
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;

  const runConfig = nameStep('scale:parallel', config);
  const emitter = createProgressEmitter('scale:parallel', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  try {
    const { maxParallel, errorPosture } = await getOptions(runConfig, {
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });

    const spec =
      known.spec ||
      (await scaleSpec(effectiveInstructions, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'scale:spec'),
      }));

    emitter.emit({ event: DomainEvent.phase, phase: 'applying-scale', specification: spec });
    const batchDone = emitter.batch(list.length);

    const results = new Array(list.length).fill(undefined);
    const indexed = list.map((value, index) => ({ value, index }));

    await parallel(
      indexed,
      async ({ value, index }) => {
        try {
          results[index] = await scaleItem(
            value,
            { text: 'Apply the scale specification to the item', spec },
            {
              ...runConfig,
              onProgress: scopePhase(runConfig.onProgress, 'item'),
            }
          );
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
        abortSignal: runConfig.abortSignal,
        label: 'scale parallel items',
      }
    );

    const failedItems = results.filter((r) => r === undefined).length;
    if (failedItems === results.length && results.length > 0) {
      throw new Error(`scale: all ${results.length} items failed to scale`);
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

mapScaleParallel.knownTexts = ['spec'];
