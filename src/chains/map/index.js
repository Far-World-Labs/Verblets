import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { extractBatchConfig } from '../../lib/progress/extract.js';
import { DomainEvent, OpEvent, Level } from '../../lib/progress/constants.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

const name = 'map';

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
  const { maxParallel = 3, errorPosture, onProgress } = config;

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

  const emitter = createProgressEmitter('map', onProgress);
  const batchDone = emitter.batch(list.length);
  emitter.progress({
    event: OpEvent.start,
    totalItems: list.length,
    totalBatches: batchesToProcess.length,
    maxParallel,
  });

  // Process batches in parallel using parallelBatch
  await parallel(
    batchesToProcess,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);

      // Build the compiled prompt for this batch
      const baseInstructions = `Transform each item in the list according to the instructions below. Apply the transformation consistently to every item.

${asXML(instructions, { tag: 'transformation-instructions' })}

IMPORTANT:
- Transform each item independently
- Apply the same transformation logic to all items
- Preserve the order of items from the input list
- Output one transformed result per input item`;

      // When a custom responseFormat is provided, the JSON schema already
      // constrains the output shape — don't add conflicting XML/newline
      // formatting instructions.
      let compiledPrompt;
      if (config.responseFormat) {
        compiledPrompt = `${baseInstructions}

The input list contains exactly ${items.length} item${items.length === 1 ? '' : 's'}.
Return exactly ${items.length} result${items.length === 1 ? '' : 's'} in the items array, one per input item.`;
      } else if (batchStyle === ListStyle.NEWLINE) {
        compiledPrompt = `${baseInstructions}

The input list contains exactly ${items.length} item${
          items.length === 1 ? '' : 's'
        }, separated by newlines.
Return exactly ${items.length} line${
          items.length === 1 ? '' : 's'
        } of output, one transformed item per line. Do not number the lines.`;
      } else {
        compiledPrompt = `${baseInstructions}

Return the transformed items as an XML list with exactly ${items.length} items:
<list>
  <item>transformed content 1</item>
  <item>transformed content 2</item>
  ...
</list>

Preserve all formatting and newlines within each <item> element.`;
      }

      try {
        const listBatchOptions = {
          ...config,
          listStyle: batchStyle,
        };

        const output = await retry(() => listBatch(items, compiledPrompt, listBatchOptions), {
          label: 'map:batch',
          config,
          onProgress,
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
        if (errorPosture === 'strict') throw error;
        // On error, mark all items in batch as undefined
        for (let j = 0; j < items.length; j += 1) {
          results[startIndex + j] = undefined;
        }
      }
    },
    {
      maxParallel,
      errorPosture,
      label: 'map batches',
    }
  );

  emitter.progress({
    event: OpEvent.complete,
    totalItems: list.length,
    processedItems: batchDone.count,
  });

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
const map = async function (list, instructions, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  const { maxAttempts, maxParallel, errorPosture } = await getOptions(runConfig, {
    maxAttempts: 3,
    maxParallel: 3,
    errorPosture: 'resilient',
  });
  emitter.start({ message: 'Map chain starting', ...extractBatchConfig({ totalItems: list.length, batchSize: runConfig.batchSize, maxAttempts, maxParallel: runConfig.maxParallel }) });

  const results = await mapOnce(list, instructions, {
    ...runConfig,
    maxAttempts,
    maxParallel,
    errorPosture,
  });

  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingItems = [];

    results.forEach((val, idx) => {
      if (val === undefined) {
        missingIdx.push(idx);
        missingItems.push(list[idx]);
      }
    });

    if (missingItems.length === 0) break;

    emitter.emit({ event: DomainEvent.step, stepName: 'retry-pass', level: Level.warn, message: 'Retrying failed items', ...extractBatchConfig({ retryCount: attempt, failedItems: missingItems.length }) });

    const retryResults = await mapOnce(missingItems, instructions, {
      ...runConfig,
      maxAttempts,
      maxParallel,
    });

    retryResults.forEach((val, i) => {
      results[missingIdx[i]] = val;
    });
  }

  // Log final results
  const successCount = results.filter((r) => r !== undefined).length;
  const resultMeta = {
    totalItems: results.length,
    successCount,
    failedItems: results.length - successCount,
  };
  emitter.complete({ message: 'Map chain complete', ...resultMeta });

  return results;
};

map.with = function (instructions, config = {}) {
  return async (item) => {
    const results = await mapOnce([item], instructions, config);
    return results[0];
  };
};

export default map;
