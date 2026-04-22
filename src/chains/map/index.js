import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'map';

function buildBatchPrompt(instructions, items, batchStyle, context, responseFormat) {
  const contextBlock = context ? `\n\n${context}` : '';
  const baseInstructions = `Transform each item in the list according to the instructions below. Apply the transformation consistently to every item.

${asXML(instructions, { tag: 'transformation-instructions' })}

IMPORTANT:
- Transform each item independently
- Apply the same transformation logic to all items
- Preserve the order of items from the input list
- Output one transformed result per input item${contextBlock}`;

  if (responseFormat) {
    return `${baseInstructions}

The input list contains exactly ${items.length} item${items.length === 1 ? '' : 's'}.
Return exactly ${items.length} result${items.length === 1 ? '' : 's'} in the items array, one per input item.`;
  }

  if (batchStyle === ListStyle.NEWLINE) {
    return `${baseInstructions}

The input list contains exactly ${items.length} item${items.length === 1 ? '' : 's'}, separated by newlines.
Return exactly ${items.length} line${items.length === 1 ? '' : 's'} of output, one transformed item per line. Do not number the lines.`;
  }

  return `${baseInstructions}

Return the transformed items as an XML list with exactly ${items.length} items:
<list>
  <item>transformed content 1</item>
  <item>transformed content 2</item>
  ...
</list>

Preserve all formatting and newlines within each <item> element.`;
}

/**
 * Map over a list of items by calling `listBatch` on XML-enriched batches.
 * Missing or mismatched output results in `undefined` entries so callers can
 * selectively retry.
 *
 * @param { string[] } list - array of items to process
 * @param { string } instructions - mapping instructions passed to `listBatch`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.batchSize] - how many items to send per batch (auto-calculated if not provided)
 * @param { number } [config.maxParallel=3] - maximum parallel requests
 * @param { string } [config.listStyle='auto'] - ListStyle enum value
 * @param { number } [config.autoModeThreshold] - character threshold for auto mode
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<(string|undefined)[]> } results aligned with input order
 */
const mapOnce = async function (list, instructions, config = {}) {
  const { maxParallel = 3, errorPosture, onProgress, _batchDone, _context } = config;

  const results = new Array(list.length);
  const batches = await createBatches(list, config);

  // Filter out skip batches
  const batchesToProcess = batches.filter((batch) => {
    if (batch.skip) {
      results[batch.startIndex] = undefined;
      return false;
    }
    return true;
  });

  const batchDone = _batchDone ?? (() => {});

  // Process batches in parallel using parallelBatch
  await parallel(
    batchesToProcess,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);
      const compiledPrompt = buildBatchPrompt(
        instructions,
        items,
        batchStyle,
        _context,
        config.responseFormat
      );

      try {
        const listBatchOptions = {
          ...config,
          onProgress: scopePhase(onProgress, 'map:list-batch'),
          listStyle: batchStyle,
        };

        const output = await retry(() => listBatch(items, compiledPrompt, listBatchOptions), {
          label: 'map:batch',
          config,
        });

        // listBatch now returns arrays directly
        if (!Array.isArray(output)) {
          throw new Error(`Expected array from listBatch, got: ${typeof output}`);
        }

        output.forEach((item, j) => {
          results[startIndex + j] = item;
        });

        batchDone(items.length);
      } catch (error) {
        // Abort errors always propagate — they signal system-level shutdown
        if (error.name === 'AbortError' || config?.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;

        // On error, mark all items in batch as undefined
        for (let j = 0; j < items.length; j += 1) {
          results[startIndex + j] = undefined;
        }
      }
    },
    {
      maxParallel,
      errorPosture,
      abortSignal: config?.abortSignal,
      label: 'map batches',
    }
  );

  return results;
};

/**
 * Map over a list of items with retry support (default export).
 * Retry undefined results until maxAttempts is reached.
 *
 * @param { string[] } list - array of items
 * @param { string } instructions - mapping instructions passed to `listBatch`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.batchSize] - items per batch (auto-calculated if not provided)
 * @param { number } [config.maxAttempts=3] - maximum retry attempts
 * @param { number } [config.maxParallel=3] - maximum parallel requests
 * @param { string } [config.listStyle='auto'] - ListStyle enum value
 * @param { number } [config.autoModeThreshold] - character threshold for auto mode
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<(string|undefined)[]> }
 */
const map = async function (list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });
  try {
    const { maxAttempts, maxParallel, errorPosture } = await getOptions(runConfig, {
      maxAttempts: 3,
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });
    const batchDone = emitter.batch(list.length);
    const results = await mapOnce(list, text, {
      ...runConfig,
      maxAttempts,
      maxParallel,
      errorPosture,
      _batchDone: batchDone,
      _context: context,
    });

    for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
      const missingIdx = [];
      const missingItems = [];

      results.forEach((val, idx) => {
        if (val == null) {
          missingIdx.push(idx);
          missingItems.push(list[idx]);
        }
      });

      if (missingItems.length === 0) break;

      const retryResults = await mapOnce(missingItems, text, {
        ...runConfig,
        maxAttempts,
        maxParallel,
        _context: context,
      });

      retryResults.forEach((val, i) => {
        results[missingIdx[i]] = val;
      });
    }

    // Log final results
    const successCount = results.filter((r) => r !== undefined).length;
    const failedItems = results.length - successCount;
    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    const resultMeta = {
      totalItems: results.length,
      successCount,
      failedItems,
      outcome,
    };
    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete(resultMeta);

    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

map.knownTexts = [];

/**
 * Streaming map: process a list incrementally, yielding partial results after
 * each batch completes. Batches are processed sequentially (not in parallel)
 * to enable incremental emission with reduced peak memory usage.
 *
 * @param {string[]} list - Items to process
 * @param {string|object} instructions - Mapping instructions
 * @param {object} [config={}] - Configuration options
 * @param {number} [config.batchSize] - Items per batch (auto-calculated if omitted)
 * @param {string} [config.errorPosture='resilient'] - 'strict' or 'resilient'
 * @param {string} [config.listStyle='auto'] - ListStyle enum value
 * @param {object} [config.responseFormat] - Custom JSON schema for output
 * @param {object} [config.llm] - LLM configuration
 * @param {Function} [config.onProgress] - Progress callback
 * @param {AbortSignal} [config.abortSignal] - Signal to abort processing
 * @returns {AsyncGenerator<(string|undefined)[]>} Yields cumulative results after each batch
 */
const streamingMap = async function* streamingMap(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep('streaming-map', config);
  const emitter = createProgressEmitter('streaming-map', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  let completed = false;
  try {
    if (list.length === 0) {
      emitter.emit({ event: DomainEvent.output, value: [] });
      emitter.complete({ totalItems: 0, totalBatches: 0, outcome: Outcome.success });
      completed = true;
      return;
    }

    const { errorPosture } = await getOptions(runConfig, {
      errorPosture: ErrorPosture.resilient,
    });

    const results = new Array(list.length);
    const batches = await createBatches(list, runConfig);
    const activeBatches = batches.filter((b) => !b.skip);
    const batchDone = emitter.batch(list.length);

    for (const batch of batches) {
      if (batch.skip) {
        results[batch.startIndex] = undefined;
        continue;
      }

      if (runConfig.abortSignal?.aborted) {
        throw runConfig.abortSignal.reason ?? new Error('The operation was aborted.');
      }

      const { items, startIndex } = batch;
      const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);
      const compiledPrompt = buildBatchPrompt(
        text,
        items,
        batchStyle,
        context,
        runConfig.responseFormat
      );

      try {
        const output = await retry(
          () =>
            listBatch(items, compiledPrompt, {
              ...runConfig,
              onProgress: scopePhase(runConfig.onProgress, 'streaming-map:list-batch'),
              listStyle: batchStyle,
            }),
          { label: 'streaming-map:batch', config: runConfig }
        );

        if (!Array.isArray(output)) {
          throw new Error(`Expected array from listBatch, got: ${typeof output}`);
        }

        output.forEach((item, j) => {
          results[startIndex + j] = item;
        });

        batchDone(items.length);
      } catch (error) {
        if (error.name === 'AbortError' || runConfig.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;

        for (let j = 0; j < items.length; j += 1) {
          results[startIndex + j] = undefined;
        }
        batchDone(items.length);
      }

      emitter.emit({ event: DomainEvent.partial, value: [...results] });
      yield [...results];
    }

    const successCount = results.filter((r) => r !== undefined).length;
    const failedItems = results.length - successCount;
    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;

    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({
      totalItems: results.length,
      totalBatches: activeBatches.length,
      successCount,
      failedItems,
      outcome,
    });
    completed = true;
  } catch (err) {
    emitter.error(err);
    completed = true;
    throw err;
  } finally {
    if (!completed) {
      emitter.complete({ outcome: Outcome.partial, earlyTermination: true });
    }
  }
};

streamingMap.knownTexts = [];

export { streamingMap };
export default map;
