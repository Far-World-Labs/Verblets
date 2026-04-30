import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { reduceAccumulatorJsonSchema } from './schemas.js';
import { retry, createBatches } from '../../lib/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

import callLlm, { jsonSchema } from '../../lib/llm/index.js';

const name = 'reduce';

// Default response format for reduce operations - simple string accumulator
const DEFAULT_REDUCE_RESPONSE_FORMAT = jsonSchema(
  reduceAccumulatorJsonSchema.name,
  reduceAccumulatorJsonSchema.schema
);

const reduce = async function reduce(list, instructions, config) {
  if (!Array.isArray(list)) {
    throw new Error(`reduce: list must be an array (got ${list === null ? 'null' : typeof list})`);
  }
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });
  try {
    const { accumulatorMode } = await getOptions(runConfig, {
      accumulatorMode: 'auto',
    });
    let acc = runConfig.initial;

    // If initial is an array and we're using default format, wrap it
    const needsItemsWrapper =
      accumulatorMode === 'collection' ||
      (accumulatorMode === 'auto' && Array.isArray(runConfig.initial) && !runConfig.responseFormat);
    if (needsItemsWrapper) {
      acc = { items: runConfig.initial };
    }

    const batches = await createBatches(list, runConfig);
    const batchDone = emitter.batch(list.length);
    const activeBatches = batches;

    emitter.progress({
      event: OpEvent.start,
      totalItems: list.length,
      totalBatches: activeBatches.length,
    });

    for (const { items, skip } of batches) {
      if (skip) continue;

      const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);

      const reduceInstructions = ({ style, count }) => {
        const itemFormat = style === ListStyle.XML ? 'XML' : '';
        const contextBlock = context ? `\n\n${context}` : '';

        return `Start with the given accumulator. Apply the transformation instructions to each item in the list sequentially, using the result as the new accumulator each time. Return only the final accumulator.

Example: If reducing ["one", "two", "three"] with "sum the numeric values" and initial value 0:
- Start: 0
- Process "one": 0 + 1 = 1
- Process "two": 1 + 2 = 3
- Process "three": 3 + 3 = 6
- Return: 6

${asXML(text, { tag: 'instructions' })}

${asXML(acc !== undefined ? acc : 'No initial value - use first item as starting point', {
  tag: 'accumulator',
})}

Process exactly ${count} items from the ${itemFormat} list below and return the final accumulator value.${contextBlock}`;
      };

      const effectiveResponseFormat = runConfig.responseFormat || DEFAULT_REDUCE_RESPONSE_FORMAT;

      const prompt = reduceInstructions({ style: batchStyle, count: items.length });
      const listBatchOptions = {
        ...runConfig,
        listStyle: batchStyle,
        responseFormat: effectiveResponseFormat,
      };

      const result = await retry(() => listBatch(items, prompt, listBatchOptions), {
        label: 'reduce:batch',
        config: runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'batch'),
      });

      if (!runConfig.responseFormat) {
        // Default schema declares { accumulator: string } — without it the
        // accumulator becomes garbage on the next iteration.
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
          throw new Error(
            `reduce: expected accumulator object from LLM (got ${
              result === null ? 'null' : typeof result
            })`
          );
        }
        if (result.accumulator === undefined) {
          throw new Error('reduce: LLM response missing required "accumulator" field');
        }
        acc = result.accumulator;
      } else {
        // Caller provided a custom schema — we can't validate shape, but
        // null/undefined accumulators corrupt subsequent batches silently.
        if (result === null || result === undefined) {
          throw new Error(
            `reduce: LLM returned ${result === null ? 'null' : 'undefined'} under custom responseFormat`
          );
        }
        acc = result;
      }

      batchDone(items.length);
    }

    emitter.progress({
      event: OpEvent.complete,
      totalItems: list.length,
      processedItems: batchDone.count,
    });

    const resultMeta = {
      totalItems: list.length,
      totalBatches: activeBatches.length,
      outcome: Outcome.success,
    };
    emitter.emit({ event: DomainEvent.output, value: acc });
    emitter.complete(resultMeta);

    return acc;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

reduce.knownTexts = [];

/**
 * Apply a single reduce step: combine an existing accumulator with one new
 * item via one LLM call. The list-form `reduce` walks batches sequentially;
 * this is the per-step primitive callers can compose into their own loops
 * (e.g. streaming consumers, generator-driven aggregations).
 *
 * @param {*} accumulator - Current accumulator value (any shape)
 * @param {*} item - Item to fold into the accumulator
 * @param {string|object} instructions - Reduction instructions
 * @param {object} [config={}] - Configuration options. `responseFormat` and
 *   `accumulatorMode` thread through identically to `reduce`.
 * @returns {Promise<*>} Updated accumulator
 */
export async function reduceItem(accumulator, item, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep('reduce:item', config);
  const emitter = createProgressEmitter('reduce:item', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: { accumulator, item } });

  try {
    const { accumulatorMode } = await getOptions(runConfig, {
      accumulatorMode: 'auto',
    });

    const needsItemsWrapper =
      accumulatorMode === 'collection' ||
      (accumulatorMode === 'auto' && Array.isArray(accumulator) && !runConfig.responseFormat);
    const acc = needsItemsWrapper ? { items: accumulator } : accumulator;

    const contextBlock = context ? `\n\n${context}` : '';
    const prompt = `Start with the given accumulator. Apply the transformation instructions to the new item, using the result as the updated accumulator. Return only the updated accumulator value.

${asXML(text, { tag: 'instructions' })}

${asXML(acc !== undefined ? acc : 'No initial value - use the item as the starting accumulator', {
  tag: 'accumulator',
})}

${asXML(item, { tag: 'item' })}${contextBlock}`;

    const effectiveResponseFormat = runConfig.responseFormat || DEFAULT_REDUCE_RESPONSE_FORMAT;
    const llmOptions = { ...runConfig, responseFormat: effectiveResponseFormat };

    const result = await retry(() => callLlm(prompt, llmOptions), {
      label: 'reduce:item',
      config: runConfig,
    });

    let newAcc;
    if (!runConfig.responseFormat) {
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(
          `reduce: expected accumulator object from LLM (got ${
            result === null ? 'null' : typeof result
          })`
        );
      }
      if (result.accumulator === undefined) {
        throw new Error('reduce: LLM response missing required "accumulator" field');
      }
      newAcc = result.accumulator;
    } else {
      if (result === null || result === undefined) {
        throw new Error(
          `reduce: LLM returned ${result === null ? 'null' : 'undefined'} under custom responseFormat`
        );
      }
      newAcc = result;
    }

    emitter.emit({ event: DomainEvent.output, value: newAcc });
    emitter.complete({ outcome: Outcome.success });
    return newAcc;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

reduceItem.knownTexts = [];

export default reduce;
