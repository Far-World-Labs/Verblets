import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { findResultJsonSchema } from './schemas.js';
import {
  emitBatchStart,
  emitBatchComplete,
  emitBatchProcessed,
  createBatchProgressCallback,
  createBatchContext,
} from '../../lib/progress-callback/index.js';

const findResponseFormat = {
  type: 'json_schema',
  json_schema: findResultJsonSchema,
};

const find = async function (list, instructions, config = {}) {
  const {
    maxParallel = 3,
    listStyle,
    autoModeThreshold,
    responseFormat,
    llm,
    onProgress,
    now = new Date(),
    ...options
  } = config;

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

  emitBatchStart(onProgress, 'find', list.length, {
    totalBatches: batchesToProcess.length,
    maxParallel,
    now,
    chainStartTime: now,
  });

  let processedItems = 0;
  let processedBatches = 0;

  // Process in chunks to allow early termination
  for (let i = 0; i < batchesToProcess.length && !foundEarly; i += maxParallel) {
    const chunk = batchesToProcess.slice(i, i + maxParallel);

    await parallelBatch(
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
                ...options,
              }),
            {
              label: `find:batch`,
              maxAttempts: 3,
              now,
              chainStartTime: now,
              onProgress: createBatchProgressCallback(
                onProgress,
                createBatchContext({
                  batchIndex: processedBatches,
                  batchSize: items.length,
                  startIndex,
                  totalItems: list.length,
                  processedItems,
                  totalBatches: batchesToProcess.length,
                  now,
                  chainStartTime: now,
                })
              ),
            }
          );

          // listBatch now returns arrays directly
          const foundItem = Array.isArray(result) && result[0];
          if (foundItem) {
            // Try to find the exact index in the original list
            const itemIndex = list.findIndex((item) => item === foundItem);
            results.push({ result: foundItem, index: itemIndex !== -1 ? itemIndex : startIndex });
          }

          processedItems += items.length;
          processedBatches++;

          emitBatchProcessed(
            onProgress,
            'find',
            {
              totalItems: list.length,
              processedItems,
              batchNumber: processedBatches,
              batchSize: items.length,
            },
            {
              batchIndex: `${startIndex}-${startIndex + items.length - 1}`,
              totalBatches: batchesToProcess.length,
              found: !!foundItem,
              now: new Date(),
              chainStartTime: now,
            }
          );
        } catch {
          // continue on error
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

  emitBatchComplete(onProgress, 'find', list.length, {
    totalBatches: batchesToProcess.length,
    found: results.length > 0,
    now: new Date(),
    chainStartTime: now,
  });

  if (results.length > 0) {
    const earliest = results.reduce((best, current) =>
      current.index < best.index ? current : best
    );
    return earliest.result;
  }

  return '';
};

export const findOnce = find;
export default find;
