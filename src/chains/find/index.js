import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { findResultJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractBatchConfig } from '../../lib/lifecycle-logger/index.js';
import { prepareBatches, parallel, retry } from '../../lib/index.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { debug } from '../../lib/debug/index.js';
import { initChain } from '../../lib/context/option.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';

const name = 'find';

const findResponseFormat = jsonSchema(findResultJsonSchema.name, findResultJsonSchema.schema);

const find = async function find(list, instructions, config = {}) {
  const {
    config: scopedConfig,
    maxParallel,
    errorPosture,
    progressMode,
  } = await initChain(name, config, {
    maxParallel: 3,
    errorPosture: 'resilient',
    progressMode: 'detailed',
  });
  config = scopedConfig;
  try {
    const lifecycleLogger = createLifecycleLogger(config.logger, 'chain:find');
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

    const { batches, tracker } = await prepareBatches('find', list, config, { progressMode });
    const batchesToProcess = batches.filter((batch) => !batch.skip);

    lifecycleLogger.logStart(
      extractBatchConfig({
        totalItems: list.length,
        totalBatches: batchesToProcess.length,
        maxParallel,
      })
    );

    // Process in chunks to allow early termination
    for (let i = 0; i < batchesToProcess.length && !foundEarly; i += maxParallel) {
      const chunk = batchesToProcess.slice(i, i + maxParallel);

      await parallel(
        chunk,
        async ({ items, startIndex }) => {
          const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);

          try {
            const result = await retry(
              () =>
                listBatch(items, findInstructions({ style: batchStyle, count: items.length }), {
                  ...config,
                  listStyle: batchStyle,
                  responseFormat: config.responseFormat || findResponseFormat,
                  logger: lifecycleLogger,
                }),
              {
                label: 'find:batch',
                config,
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
            if (errorPosture === 'strict') throw error;
            debug(`find batch at index ${startIndex} failed: ${error.message}`);
          }
        },
        {
          maxParallel,
          errorPosture,
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
      const foundMeta = { found: true, totalItems: list.length };
      lifecycleLogger.logResult(earliest.result, foundMeta);
      emitChainResult(config, name, foundMeta);
      return earliest.result;
    }

    const notFoundMeta = { found: false, totalItems: list.length };
    lifecycleLogger.logResult('', notFoundMeta);
    emitChainResult(config, name, notFoundMeta);
    return '';
  } catch (err) {
    emitChainError(config, name, err);
    throw err;
  }
};

export default find;
