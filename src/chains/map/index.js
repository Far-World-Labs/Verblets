import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import {
  createLifecycleLogger,
  extractBatchConfig,
  extractPromptAnalysis,
} from '../../lib/lifecycle-logger/index.js';
import {
  emitBatchStart,
  emitBatchComplete,
  emitBatchProcessed,
  createBatchProgressCallback,
  createBatchContext,
} from '../../lib/progress-callback/index.js';

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
  const { maxParallel = 3, onProgress, now = new Date(), chainStartTime } = config;

  const results = new Array(list.length);
  const batches = createBatches(list, config);

  // Filter out skip batches
  const batchesToProcess = batches.filter((batch) => {
    if (batch.skip) {
      results[batch.startIndex] = undefined;
      return false;
    }
    return true;
  });

  // Log batch processing start
  if (config.logger?.info) {
    config.logger.info('Map chain processing batches', {
      totalBatches: batchesToProcess.length,
      maxParallel,
      batchSizes: batchesToProcess.map((b) => b.items.length),
    });
  }

  emitBatchStart(onProgress, 'map', list.length, {
    totalBatches: batchesToProcess.length,
    maxParallel,
    now,
    chainStartTime: chainStartTime || now,
  });

  let processedBatches = 0;
  let processedItems = 0;

  // Process batches in parallel using parallelBatch
  await parallelBatch(
    batchesToProcess,
    async ({ items, startIndex }) => {
      const currentBatchNumber = processedBatches + 1;
      const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);

      // Build the compiled prompt for this batch
      const baseInstructions = `Transform each item in the list according to the instructions below. Apply the transformation consistently to every item.

${asXML(instructions, { tag: 'transformation-instructions' })}

IMPORTANT:
- Transform each item independently
- Apply the same transformation logic to all items
- Preserve the order of items from the input list
- Output one transformed result per input item`;

      const compiledPrompt =
        batchStyle === ListStyle.NEWLINE
          ? `${baseInstructions}

The input list contains exactly ${items.length} item${
              items.length === 1 ? '' : 's'
            }, separated by newlines.
Return exactly ${items.length} line${
              items.length === 1 ? '' : 's'
            } of output, one transformed item per line. Do not number the lines.`
          : `${baseInstructions}

Return the transformed items as an XML list with exactly ${items.length} items:
<list>
  <item>transformed content 1</item>
  <item>transformed content 2</item>
  ...
</list>

Preserve all formatting and newlines within each <item> element.`;

      // Log the compiled prompt for this batch
      if (config.logger) {
        config.logger.logEvent('batch-prompt', extractPromptAnalysis(compiledPrompt));
      }

      try {
        const listBatchOptions = {
          ...config,
          listStyle: batchStyle,
        };

        const output = await retry(() => listBatch(items, compiledPrompt, listBatchOptions), {
          label: `map:batch`,
          maxAttempts: config.maxAttempts || 3,
          onProgress: createBatchProgressCallback(
            onProgress,
            createBatchContext({
              batchIndex: currentBatchNumber - 1,
              batchSize: items.length,
              startIndex,
              totalItems: list.length,
              processedItems,
              totalBatches: batchesToProcess.length,
              now,
              chainStartTime: chainStartTime || now,
            })
          ),
          chatGPTPrompt: `${compiledPrompt}\n\nItems: ${JSON.stringify(items).substring(
            0,
            500
          )}...`,
          chatGPTConfig: listBatchOptions,
          now,
          chainStartTime: chainStartTime || now,
        });

        // listBatch now returns arrays directly
        if (!Array.isArray(output)) {
          throw new Error(`Expected array from listBatch, got: ${typeof output}`);
        }

        output.forEach((item, j) => {
          results[startIndex + j] = item;
        });

        processedBatches++;
        processedItems += items.length;

        emitBatchProcessed(
          onProgress,
          'map',
          {
            totalItems: list.length,
            processedItems,
            batchNumber: currentBatchNumber,
            batchSize: items.length,
          },
          {
            batchIndex: `${startIndex}-${startIndex + items.length - 1}`,
            totalBatches: batchesToProcess.length,
            now: new Date(),
            chainStartTime: chainStartTime || now,
          }
        );

        if (config.logger?.info) {
          config.logger.info(`Map batch completed`, {
            batchIndex: processedBatches,
            startIndex,
            itemCount: items.length,
            successCount: output.length,
          });
        }
      } catch (error) {
        // Log the error before marking items as undefined
        if (config.logger?.error) {
          config.logger.error(`Map batch ${startIndex}-${startIndex + items.length - 1} failed`, {
            error: error.message,
            batchIndex: processedBatches + 1,
            itemCount: items.length,
          });
        }

        // On error, mark all items in batch as undefined
        for (let j = 0; j < items.length; j += 1) {
          results[startIndex + j] = undefined;
        }
      }
    },
    {
      maxParallel,
      label: 'map batches',
    }
  );

  emitBatchComplete(onProgress, 'map', list.length, {
    totalBatches: batchesToProcess.length,
    now: new Date(),
    chainStartTime: chainStartTime || now,
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
  const { maxAttempts = 3, logger, now = new Date() } = config;

  // Create logger for map chain
  const lifecycleLogger = createLifecycleLogger(logger, 'chain:map');

  // Log detailed config for debugging
  if (logger?.info) {
    logger.info('Map chain starting', {
      itemCount: list.length,
      instructionsLength: instructions?.length,
      llm: config.llm,
      batchSize: config.batchSize,
      maxParallel: config.maxParallel,
      maxAttempts,
      hasOnProgress: !!config.onProgress,
    });
  }

  // Log map chain start with batch configuration
  lifecycleLogger.logStart(
    extractBatchConfig({
      totalItems: list.length,
      batchSize: config.batchSize,
      maxAttempts,
      maxParallel: config.maxParallel,
    })
  );

  const results = await mapOnce(list, instructions, {
    ...config,
    logger: lifecycleLogger,
    now,
    chainStartTime: now,
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

    // Log retry attempt
    lifecycleLogger.logEvent(
      'retry',
      extractBatchConfig({
        retryCount: attempt,
        failedItems: missingItems.length,
      })
    );

    const retryResults = await mapOnce(missingItems, instructions, {
      ...config,
      logger: lifecycleLogger,
      now: new Date(),
      chainStartTime: now,
    });

    retryResults.forEach((val, i) => {
      results[missingIdx[i]] = val;
    });
  }

  // Log final results
  const successCount = results.filter((r) => r !== undefined).length;
  lifecycleLogger.logResult(results, {
    totalItems: results.length,
    successCount,
    failedItems: results.length - successCount,
  });

  return results;
};

export { mapOnce };
export default map;
