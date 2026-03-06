import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { findResultJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractBatchConfig } from '../../lib/lifecycle-logger/index.js';
import { createBatches, parallel, retry, batchTracker } from '../../lib/index.js';
import { debug } from '../../lib/debug/index.js';

const findResponseFormat = {
  type: 'json_schema',
  json_schema: findResultJsonSchema,
};

const find = async function find(list, instructions, config = {}) {
  const {
    maxParallel = 3,
    maxAttempts = 3,
    listStyle,
    autoModeThreshold,
    responseFormat,
    llm,
    logger,
    onProgress,
    now = new Date(),
    ...options
  } = config;

  const lifecycleLogger = createLifecycleLogger(logger, 'chain:find');

  const batches = createBatches(list, config);
  const findInstructions = ({ style, count }) => {
    const baseInstructions = `From the list below, identify and return the SINGLE item that BEST matches the search criteria.

${asXML(instructions, { tag: 'search-criteria' })}

IMPORTANT:
- Evaluate all items before selecting
- Choose the BEST match, not just any match
- Return the complete original item text, unchanged
- If NO items match the criteria, return an empty string
- Return ONLY ONE item, even if multiple items match`;

    if (style === ListStyle.NEWLINE) {
      return `${baseInstructions}

Process exactly ${count} items from the list below and return the single best match.`;
    }

    return `${baseInstructions}

Process exactly ${count} items from the XML list below and return the single best match.`;
  };

  const results = [];
  let foundEarly = false;

  // Filter out skip batches
  const batchesToProcess = batches.filter((batch) => !batch.skip);

  lifecycleLogger.logStart(
    extractBatchConfig({
      totalItems: list.length,
      totalBatches: batchesToProcess.length,
      maxParallel,
    })
  );

  const tracker = batchTracker('find', list.length, { onProgress, now });

  tracker.start(batchesToProcess.length, maxParallel);

  // Process in chunks to allow early termination
  for (let i = 0; i < batchesToProcess.length && !foundEarly; i += maxParallel) {
    const chunk = batchesToProcess.slice(i, i + maxParallel);

    await parallel(
      chunk,
      async ({ items, startIndex }) => {
        const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

        try {
          const result = await retry(
            () =>
              listBatch(items, findInstructions({ style: batchStyle, count: items.length }), {
                listStyle: batchStyle,
                autoModeThreshold,
                responseFormat: responseFormat || findResponseFormat,
                llm,
                logger: lifecycleLogger,
                ...options,
              }),
            {
              label: 'find:batch',
              maxAttempts,
              onProgress: tracker.forBatch(startIndex, items.length),
            }
          );

          // listBatch now returns arrays directly
          const foundItem = Array.isArray(result) && result[0];
          if (foundItem) {
            // Try to find the exact index in the original list
            const itemIndex = list.findIndex((item) => item === foundItem);
            const matchIndex = itemIndex !== -1 ? itemIndex : startIndex;
            results.push({ result: foundItem, index: matchIndex });
            lifecycleLogger.logEvent('match-found', { result: foundItem, index: matchIndex });
          }

          tracker.batchDone(startIndex, items.length);
        } catch (error) {
          debug(`find batch at index ${startIndex} failed: ${error.message}`);
        }
      },
      {
        maxParallel,
        label: 'find batches',
      }
    );

    // Check for early termination after each chunk
    if (results.length > 0) {
      foundEarly = true;
    }
  }

  tracker.complete({ found: results.length > 0 });

  if (results.length > 0) {
    const earliest = results.reduce((best, current) =>
      current.index < best.index ? current : best
    );
    lifecycleLogger.logResult(earliest.result, { found: true, totalItems: list.length });
    return earliest.result;
  }

  lifecycleLogger.logResult('', { found: false, totalItems: list.length });
  return '';
};

export default find;
