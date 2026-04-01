import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { reduceAccumulatorJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractBatchConfig } from '../../lib/lifecycle-logger/index.js';
import { retry, createBatches } from '../../lib/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { OpEvent } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

import { jsonSchema } from '../../lib/llm/index.js';

const name = 'reduce';

// Default response format for reduce operations - simple string accumulator
const DEFAULT_REDUCE_RESPONSE_FORMAT = jsonSchema(
  reduceAccumulatorJsonSchema.name,
  reduceAccumulatorJsonSchema.schema
);

const reduce = async function reduce(list, instructions, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  try {
    const { accumulatorMode } = await getOptions(runConfig, {
      accumulatorMode: 'auto',
    });
    const lifecycleLogger = createLifecycleLogger(runConfig.logger, 'chain:reduce');

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
    const activeBatches = batches.filter((b) => !b.skip);

    emitter.progress({
      event: OpEvent.start,
      totalItems: list.length,
      totalBatches: activeBatches.length,
    });

    lifecycleLogger.logStart(
      extractBatchConfig({
        totalItems: list.length,
        totalBatches: activeBatches.length,
        batchSize: runConfig.batchSize,
      })
    );

    for (const [batchIndex, { items, skip }] of batches.entries()) {
      if (skip) {
        lifecycleLogger.logEvent('batch-skip', { batchIndex });
        continue;
      }

      const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);

      const reduceInstructions = ({ style, count }) => {
        const itemFormat = style === ListStyle.XML ? 'XML' : '';

        return `Start with the given accumulator. Apply the transformation instructions to each item in the list sequentially, using the result as the new accumulator each time. Return only the final accumulator.

Example: If reducing ["one", "two", "three"] with "sum the numeric values" and initial value 0:
- Start: 0
- Process "one": 0 + 1 = 1
- Process "two": 1 + 2 = 3
- Process "three": 3 + 3 = 6
- Return: 6

${asXML(instructions, { tag: 'instructions' })}

${asXML(
  acc !== undefined && acc !== null ? acc : 'No initial value - use first item as starting point',
  { tag: 'accumulator' }
)}

Process exactly ${count} items from the ${itemFormat} list below and return the final accumulator value.`;
      };

      const effectiveResponseFormat = runConfig.responseFormat || DEFAULT_REDUCE_RESPONSE_FORMAT;

      const prompt = reduceInstructions({ style: batchStyle, count: items.length });
      const listBatchOptions = {
        ...runConfig,
        listStyle: batchStyle,
        responseFormat: effectiveResponseFormat,
        logger: lifecycleLogger,
      };

      const result = await retry(() => listBatch(items, prompt, listBatchOptions), {
        label: 'reduce:batch',
        config: runConfig,
        onProgress: runConfig.onProgress,
      });

      if (!runConfig.responseFormat && result?.accumulator !== undefined) {
        acc = result.accumulator;
      } else {
        acc = result;
      }

      batchDone(items.length);

      lifecycleLogger.logEvent('batch-done', {
        batchIndex,
        accType: typeof acc,
      });
    }

    emitter.progress({
      event: OpEvent.complete,
      totalItems: list.length,
      processedItems: batchDone.count,
    });

    const resultMeta = {
      totalItems: list.length,
      totalBatches: activeBatches.length,
      outcome: 'success',
    };
    lifecycleLogger.logResult(acc, resultMeta);
    emitter.complete(resultMeta);

    return acc;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

reduce.with = function (instructions, config = {}) {
  return async (acc, item) => {
    return await reduce([item], instructions, { ...config, initial: acc });
  };
};

export default reduce;
