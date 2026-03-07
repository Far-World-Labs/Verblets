import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { filterDecisionsJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractBatchConfig } from '../../lib/lifecycle-logger/index.js';
import { createBatches, retry, batchTracker } from '../../lib/index.js';

const filterResponseFormat = {
  type: 'json_schema',
  json_schema: filterDecisionsJsonSchema,
};

const filter = async function filter(list, instructions, config = {}) {
  const {
    listStyle,
    autoModeThreshold,
    responseFormat,
    llm,
    maxAttempts = 3,
    logger,
    onProgress,
    abortSignal,
    now = new Date(),
    ...options
  } = config;

  const lifecycleLogger = createLifecycleLogger(logger, 'chain:filter');

  lifecycleLogger.logStart(
    extractBatchConfig({
      totalItems: list.length,
      batchSize: config.batchSize,
      maxAttempts,
    })
  );

  const results = [];
  const batches = createBatches(list, config);
  const activeBatches = batches.filter((b) => !b.skip);

  lifecycleLogger.logEvent('batches-created', {
    totalBatches: batches.length,
    activeBatches: activeBatches.length,
    batchSizes: batches.map((b) => b.items?.length || 0),
  });

  const tracker = batchTracker('filter', list.length, { onProgress, now });

  tracker.start(activeBatches.length);

  for (const [batchIndex, { items, skip, startIndex }] of batches.entries()) {
    if (skip) {
      lifecycleLogger.logEvent('batch-skip', { batchIndex });
      continue;
    }

    lifecycleLogger.logEvent('batch-start', {
      batchIndex,
      itemCount: items.length,
    });

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const filterInstructions = ({ style, count }) => {
      const baseInstructions = `For each item in the list below, determine if it satisfies the filtering criteria. Return "yes" to include the item or "no" to exclude it. Return exactly one decision per item, in the same order as the input list.

${asXML(instructions, { tag: 'filtering-criteria' })}

IMPORTANT:
- Evaluate each item independently
- Consider all aspects of the filtering criteria
- Return only "yes" or "no" for each item
- Maintain the exact order of the input list`;

      if (style === ListStyle.NEWLINE) {
        return `${baseInstructions}

Process exactly ${count} items from the list below and return ${count} yes/no decisions.`;
      }

      return `${baseInstructions}

Process exactly ${count} items from the XML list below and return ${count} yes/no decisions.`;
    };

    const prompt = filterInstructions({ style: batchStyle, count: items.length });
    const listBatchOptions = {
      listStyle: batchStyle,
      autoModeThreshold,
      responseFormat: responseFormat ?? filterResponseFormat,
      llm,
      logger: lifecycleLogger,
      ...options,
    };

    let response;
    try {
      response = await retry(() => listBatch(items, prompt, listBatchOptions), {
        label: 'filter:batch',
        maxAttempts,
        onProgress: tracker.forBatch(startIndex, items.length),
        abortSignal,
      });
    } catch (error) {
      lifecycleLogger.logError(error, { batchIndex, itemCount: items.length });
      throw error;
    }

    // listBatch now returns arrays directly
    const decisions = response;

    let included = 0;
    items.forEach((item, i) => {
      const decision = decisions[i]?.toLowerCase().trim();
      if (decision === 'yes') {
        results.push(item);
        included++;
      }
    });

    tracker.batchDone(startIndex, items.length);

    lifecycleLogger.logEvent('batch-done', {
      batchIndex,
      included,
      itemCount: items.length,
    });
  }

  tracker.complete();

  lifecycleLogger.logResult(results, {
    inputCount: list.length,
    outputCount: results.length,
  });

  return results;
};

filter.with = function (criteria, config = {}) {
  return async (item) => {
    const results = await filter([item], criteria, config);
    return results.length > 0;
  };
};

export default filter;
