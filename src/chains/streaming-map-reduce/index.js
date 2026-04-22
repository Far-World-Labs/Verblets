import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { streamingReduceAccumulatorSchema } from './schemas.js';
import { createBatches, retry } from '../../lib/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { jsonSchema } from '../../lib/llm/index.js';

const name = 'streaming-map-reduce';

const DEFAULT_REDUCE_FORMAT = jsonSchema(
  streamingReduceAccumulatorSchema.name,
  streamingReduceAccumulatorSchema.schema
);

function formatAccumulator(acc) {
  if (acc === undefined) return 'No accumulator yet — use the items to create the initial value';
  if (typeof acc === 'string') return acc;
  return JSON.stringify(acc, undefined, 2);
}

function buildMapPrompt(instruction, items, style, context) {
  const formatBlock =
    style === ListStyle.NEWLINE
      ? `The input list contains exactly ${items.length} item${items.length === 1 ? '' : 's'}, separated by newlines.\nReturn exactly ${items.length} line${items.length === 1 ? '' : 's'} of output, one transformed item per line. Do not number the lines.`
      : `Return the transformed items as an XML list with exactly ${items.length} items:\n<list>\n  <item>transformed content 1</item>\n  <item>transformed content 2</item>\n  ...\n</list>\n\nPreserve all formatting and newlines within each <item> element.`;

  const parts = [
    context,
    'Transform each item in the list according to the instructions below. Apply the transformation consistently to every item.',
    asXML(instruction, { tag: 'transformation-instructions' }),
    'IMPORTANT:\n- Transform each item independently\n- Apply the same transformation logic to all items\n- Preserve the order of items from the input list\n- Output one transformed result per input item',
    formatBlock,
  ];

  return parts.filter(Boolean).join('\n\n');
}

function buildReducePrompt(instruction, count, accumulator, context) {
  const parts = [
    context,
    'Fold the items below into the accumulator by following the instructions. Return only the updated accumulator.',
    asXML(instruction, { tag: 'instructions' }),
    asXML(formatAccumulator(accumulator), { tag: 'accumulator' }),
    `Process exactly ${count} item${count === 1 ? '' : 's'} and return the updated accumulator value.`,
  ];

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Streaming map-reduce: process a list incrementally through map and reduce
 * phases, emitting partial results after each batch.
 *
 * Each batch of items is first mapped (transformed), then reduced (folded into
 * a running accumulator). After each batch the current accumulator is emitted
 * as a DomainEvent.partial event, giving consumers incremental visibility.
 *
 * @param {string[]} list - Items to process
 * @param {string|object} instructions - Map instruction string, or { map, reduce } bundle
 * @param {object} [config={}] - Configuration options
 * @param {*} [config.initial] - Initial accumulator value
 * @param {number} [config.batchSize] - Items per batch (auto-calculated if omitted)
 * @param {string} [config.errorPosture='resilient'] - 'strict' or 'resilient'
 * @param {object} [config.responseFormat] - Custom JSON schema for reduce output
 * @param {object} [config.llm] - LLM configuration
 * @param {Function} [config.onProgress] - Progress callback
 * @returns {Promise<*>} Final accumulated value
 */
const streamingMapReduce = async function streamingMapReduce(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['map', 'reduce']);
  const { text, known, context } = resolveTexts(instructions, ['map', 'reduce']);

  const mapInstruction = known.map ?? text;
  const reduceInstruction =
    known.reduce ?? 'Combine the processed items with the current accumulator';

  if (!mapInstruction) {
    throw new Error(
      'Map instruction is required: provide a string, or { map: "...", reduce: "..." }'
    );
  }

  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  try {
    if (list.length === 0) {
      const result = runConfig.initial;
      emitter.emit({ event: DomainEvent.output, value: result });
      emitter.complete({ totalItems: 0, totalBatches: 0, outcome: Outcome.success });
      return result;
    }

    const { errorPosture } = await getOptions(runConfig, {
      errorPosture: ErrorPosture.resilient,
    });

    const batches = await createBatches(list, runConfig);
    const activeBatches = batches.filter((b) => !b.skip);
    const batchDone = emitter.batch(list.length);

    let accumulator = runConfig.initial;
    let successCount = 0;
    let failedCount = 0;

    for (const { items, skip } of batches) {
      if (skip) continue;

      if (runConfig.abortSignal?.aborted) {
        throw runConfig.abortSignal.reason ?? new Error('The operation was aborted.');
      }

      const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);

      // --- Map phase ---
      emitter.emit({ event: DomainEvent.phase, phase: 'map' });

      let mapped;
      try {
        const mapPrompt = buildMapPrompt(mapInstruction, items, batchStyle, context);
        mapped = await retry(
          () =>
            listBatch(items, mapPrompt, {
              ...runConfig,
              onProgress: scopePhase(runConfig.onProgress, 'map'),
              listStyle: batchStyle,
              responseFormat: undefined,
            }),
          { label: 'streaming-map-reduce:map', config: runConfig }
        );

        if (!Array.isArray(mapped)) {
          throw new Error(`Expected array from map phase, got: ${typeof mapped}`);
        }
      } catch (error) {
        if (error.name === 'AbortError' || runConfig.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;
        failedCount += items.length;
        batchDone(items.length);
        continue;
      }

      // --- Reduce phase ---
      emitter.emit({ event: DomainEvent.phase, phase: 'reduce' });

      try {
        const reducePrompt = buildReducePrompt(
          reduceInstruction,
          mapped.length,
          accumulator,
          context
        );
        const reduceResponseFormat = runConfig.responseFormat || DEFAULT_REDUCE_FORMAT;

        const result = await retry(
          () =>
            listBatch(mapped, reducePrompt, {
              ...runConfig,
              onProgress: scopePhase(runConfig.onProgress, 'reduce'),
              listStyle: batchStyle,
              responseFormat: reduceResponseFormat,
            }),
          { label: 'streaming-map-reduce:reduce', config: runConfig }
        );

        if (!runConfig.responseFormat && result?.accumulator !== undefined) {
          accumulator = result.accumulator;
        } else {
          accumulator = result;
        }
      } catch (error) {
        if (error.name === 'AbortError' || runConfig.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;
        failedCount += items.length;
        batchDone(items.length);
        continue;
      }

      successCount += items.length;
      batchDone(items.length);

      emitter.emit({ event: DomainEvent.partial, value: accumulator });
    }

    const outcome =
      failedCount > 0 ? (successCount > 0 ? Outcome.partial : Outcome.degraded) : Outcome.success;

    emitter.emit({ event: DomainEvent.output, value: accumulator });
    emitter.complete({
      totalItems: list.length,
      totalBatches: activeBatches.length,
      successCount,
      failedItems: failedCount,
      outcome,
    });

    return accumulator;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

streamingMapReduce.knownTexts = ['map', 'reduce'];

export default streamingMapReduce;
