import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { reduceAccumulatorJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractBatchConfig } from '../../lib/lifecycle-logger/index.js';
import { retry, prepareBatches } from '../../lib/index.js';
import { initChain } from '../../lib/context/option.js';

import { jsonSchema } from '../../lib/llm/index.js';

// Default response format for reduce operations - simple string accumulator
const DEFAULT_REDUCE_RESPONSE_FORMAT = jsonSchema(
  reduceAccumulatorJsonSchema.name,
  reduceAccumulatorJsonSchema.schema
);

const reduce = async function reduce(list, instructions, config = {}) {
  const {
    config: scopedConfig,
    progressMode,
    accumulatorMode,
  } = await initChain('reduce', config, {
    progressMode: 'detailed',
    accumulatorMode: 'auto',
  });
  config = scopedConfig;

  const lifecycleLogger = createLifecycleLogger(config.logger, 'chain:reduce');

  let acc = config.initial;

  // If initial is an array and we're using default format, wrap it
  const needsItemsWrapper =
    accumulatorMode === 'collection' ||
    (accumulatorMode === 'auto' && Array.isArray(config.initial) && !config.responseFormat);
  if (needsItemsWrapper) {
    acc = { items: config.initial };
  }

  const { batches, tracker } = await prepareBatches('reduce', list, config, { progressMode });
  const activeBatches = batches.filter((b) => !b.skip);

  lifecycleLogger.logStart(
    extractBatchConfig({
      totalItems: list.length,
      totalBatches: activeBatches.length,
      batchSize: config.batchSize,
    })
  );

  for (const [batchIndex, { items, skip, startIndex }] of batches.entries()) {
    if (skip) {
      lifecycleLogger.logEvent('batch-skip', { batchIndex });
      continue;
    }

    const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);

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

    const effectiveResponseFormat = config.responseFormat || DEFAULT_REDUCE_RESPONSE_FORMAT;

    const prompt = reduceInstructions({ style: batchStyle, count: items.length });
    const listBatchOptions = {
      ...config,
      listStyle: batchStyle,
      responseFormat: effectiveResponseFormat,
      logger: lifecycleLogger,
    };

    const result = await retry(() => listBatch(items, prompt, listBatchOptions), {
      label: 'reduce:batch',
      config,
      onProgress: tracker.forBatch(startIndex, items.length),
    });

    if (!config.responseFormat && result?.accumulator !== undefined) {
      acc = result.accumulator;
    } else {
      acc = result;
    }

    tracker.batchDone(startIndex, items.length);

    lifecycleLogger.logEvent('batch-done', {
      batchIndex,
      accType: typeof acc,
    });
  }

  tracker.complete();

  lifecycleLogger.logResult(acc, {
    totalItems: list.length,
    totalBatches: activeBatches.length,
  });

  return acc;
};

reduce.with = function (instructions, config = {}) {
  return async (acc, item) => {
    return await reduce([item], instructions, { ...config, initial: acc });
  };
};

export default reduce;
