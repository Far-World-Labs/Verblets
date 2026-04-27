import listBatch, { determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'map';
const UNPROCESSED = Symbol('unprocessed');

function buildBatchPrompt(instructions, items, context) {
  const contextBlock = context ? `\n\n${context}` : '';
  return `Transform each item in the list according to the instructions below. Apply the transformation consistently to every item.

${asXML(instructions, { tag: 'transformation-instructions' })}

IMPORTANT:
- Transform each item independently
- Apply the same transformation logic to all items
- Preserve the order of items from the input list
- Output one transformed result per input item${contextBlock}

The input list contains exactly ${items.length} item${items.length === 1 ? '' : 's'}.
Return exactly ${items.length} result${items.length === 1 ? '' : 's'} in the items array, one per input item.`;
}

/**
 * Map over a list of items by calling `listBatch` on XML-enriched batches.
 * In resilient mode, slots whose batch fails are left as undefined so callers
 * can distinguish "successfully transformed" from "failed to process."
 * Output items can be any shape the transformation produces — strings, numbers,
 * objects — whatever `listBatch` returns.
 *
 * @param { Array } list - items to process; any shape
 * @param { string } instructions - mapping instructions passed to `listBatch`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.batchSize] - how many items to send per batch (auto-calculated if not provided)
 * @param { number } [config.maxParallel=3] - maximum parallel requests
 * @param { string } [config.listStyle='auto'] - ListStyle enum value
 * @param { number } [config.autoModeThreshold] - character threshold for auto mode
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<Array> } results aligned with input order; undefined for failed slots in resilient mode
 */
const mapOnce = async function (list, instructions, config = {}) {
  const { maxParallel = 3, errorPosture, onProgress, _batchDone, _context } = config;

  const results = new Array(list.length).fill(UNPROCESSED);
  const batches = await createBatches(list, config);

  const batchDone = _batchDone ?? (() => {});

  await parallel(
    batches,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);
      const compiledPrompt = buildBatchPrompt(instructions, items, _context);

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

        if (!Array.isArray(output)) {
          throw new Error(`Expected array from listBatch, got: ${typeof output}`);
        }

        // Skip undefined LLM responses so they stay UNPROCESSED and become
        // retry candidates. Real outputs (including null, 0, '') are accepted.
        const count = Math.min(output.length, items.length);
        for (let j = 0; j < count; j++) {
          if (output[j] !== undefined) {
            results[startIndex + j] = output[j];
          }
        }

        batchDone(items.length);
      } catch (error) {
        if (error.name === 'AbortError' || config?.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;
        batchDone(items.length);
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
 * Output items can be any shape the transformation produces. In resilient
 * mode, slots that fail every retry are returned as undefined so callers can
 * distinguish them from successful results.
 *
 * @param { Array } list - items to process; any shape
 * @param { string } instructions - mapping instructions passed to `listBatch`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.batchSize] - items per batch (auto-calculated if not provided)
 * @param { number } [config.maxAttempts=3] - maximum retry attempts
 * @param { number } [config.maxParallel=3] - maximum parallel requests
 * @param { string } [config.listStyle='auto'] - ListStyle enum value
 * @param { number } [config.autoModeThreshold] - character threshold for auto mode
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<Array> } results aligned with input order; undefined for failed slots in resilient mode
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
        if (val === UNPROCESSED) {
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

    let failedItems = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i] === UNPROCESSED) {
        results[i] = undefined;
        failedItems++;
      }
    }

    if (failedItems === results.length && results.length > 0) {
      const err = new Error(`map: all ${results.length} items failed to process`);
      emitter.error(err);
      throw err;
    }

    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    const resultMeta = {
      totalItems: results.length,
      successCount: results.length - failedItems,
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
 * Each yielded snapshot is positionally aligned with the input. Slots that
 * haven't been processed yet (or that failed) are `undefined` — the snapshot
 * doesn't fabricate pre-transformed originals.
 *
 * @param {Array} list - Items to process; any shape
 * @param {string|object} instructions - Mapping instructions
 * @param {object} [config={}] - Configuration options
 * @param {number} [config.batchSize] - Items per batch (auto-calculated if omitted)
 * @param {string} [config.errorPosture='resilient'] - 'strict' or 'resilient'
 * @param {string} [config.listStyle='auto'] - ListStyle enum value
 * @param {object} [config.responseFormat] - Custom JSON schema for output
 * @param {object} [config.llm] - LLM configuration
 * @param {Function} [config.onProgress] - Progress callback
 * @param {AbortSignal} [config.abortSignal] - Signal to abort processing
 * @returns {AsyncGenerator<Array>} Yields cumulative results; `undefined` for slots not yet processed or failed
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

    const results = new Array(list.length).fill(UNPROCESSED);
    const batches = await createBatches(list, runConfig);
    const batchDone = emitter.batch(list.length);

    for (const batch of batches) {
      if (runConfig.abortSignal?.aborted) {
        throw runConfig.abortSignal.reason ?? new Error('The operation was aborted.');
      }

      const { items, startIndex } = batch;
      const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);
      const compiledPrompt = buildBatchPrompt(text, items, context);

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

        // Skip undefined LLM responses so they stay UNPROCESSED.
        const count = Math.min(output.length, items.length);
        for (let j = 0; j < count; j++) {
          if (output[j] !== undefined) {
            results[startIndex + j] = output[j];
          }
        }

        batchDone(items.length);
      } catch (error) {
        if (error.name === 'AbortError' || runConfig.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;
        batchDone(items.length);
      }

      const snapshot = results.map((r) => (r === UNPROCESSED ? undefined : r));
      emitter.emit({ event: DomainEvent.partial, value: snapshot });
      yield snapshot;
    }

    let failedItems = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i] === UNPROCESSED) {
        results[i] = undefined;
        failedItems++;
      }
    }

    if (failedItems === results.length && results.length > 0) {
      const err = new Error(`streamingMap: all ${results.length} items failed to process`);
      emitter.error(err);
      completed = true;
      throw err;
    }

    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;

    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({
      totalItems: results.length,
      totalBatches: batches.length,
      successCount: results.length - failedItems,
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
