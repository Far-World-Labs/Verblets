import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { filterDecisionsJsonSchema } from './schemas.js';
import { createLifecycleLogger, extractBatchConfig } from '../../lib/lifecycle-logger/index.js';
import { createBatches, retry, batchTracker } from '../../lib/index.js';
import { getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';

// ===== Option Mappers =====

const DEFAULT_STRICTNESS = { guidance: undefined, errorPosture: 'strict' };

/**
 * Map strictness option to borderline handling guidance + error posture coordination.
 * low: include when uncertain, resilient error handling (fewer false negatives).
 * high: exclude when uncertain, strict error handling (fewer false positives).
 * med: explicit normal mode — default behavior.
 * @param {string|object|undefined} value
 * @returns {{ guidance: string|undefined, errorPosture: string }}
 */
export const mapStrictness = (value) => {
  if (value === undefined) return DEFAULT_STRICTNESS;
  if (typeof value === 'object') return value;
  return (
    {
      low: {
        guidance:
          'When uncertain whether an item satisfies the criteria, err on the side of inclusion — return "yes". Only exclude items that clearly fail.',
        errorPosture: 'resilient',
      },
      med: DEFAULT_STRICTNESS,
      high: {
        guidance:
          'When uncertain whether an item satisfies the criteria, err on the side of exclusion — return "no". Only include items that clearly pass.',
        errorPosture: 'strict',
      },
    }[value] ?? DEFAULT_STRICTNESS
  );
};

const filterResponseFormat = {
  type: 'json_schema',
  json_schema: filterDecisionsJsonSchema,
};

const filter = async function filter(list, instructions, config = {}) {
  config = scopeOperation('filter', config);
  const { guidance, maxAttempts, retryDelay, retryOnAll, progressMode, errorPosture } =
    await getOptions(config, {
      strictness: withPolicy(mapStrictness, ['guidance', 'errorPosture']),
      maxAttempts: 3,
      retryDelay: 1000,
      retryOnAll: false,
      progressMode: 'detailed',
    });
  const lifecycleLogger = createLifecycleLogger(config.logger, 'chain:filter');

  lifecycleLogger.logStart(
    extractBatchConfig({
      totalItems: list.length,
      batchSize: config.batchSize,
      maxAttempts,
    })
  );

  const results = [];
  const batches = await createBatches(list, config);
  const activeBatches = batches.filter((b) => !b.skip);

  lifecycleLogger.logEvent('batches-created', {
    totalBatches: batches.length,
    activeBatches: activeBatches.length,
    batchSizes: batches.map((b) => b.items?.length || 0),
  });

  const tracker = batchTracker('filter', list.length, {
    onProgress: config.onProgress,
    progressMode,
    now: config.now ?? new Date(),
  });

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

    const batchStyle = determineStyle(config.listStyle, items, config.autoModeThreshold);

    const filterInstructions = ({ style, count }) => {
      const strictnessBlock = guidance
        ? `\n\n${asXML(guidance, { tag: 'borderline-handling' })}`
        : '';

      const baseInstructions = `For each item in the list below, determine if it satisfies the filtering criteria. Return "yes" to include the item or "no" to exclude it. Return exactly one decision per item, in the same order as the input list.

${asXML(instructions, { tag: 'filtering-criteria' })}${strictnessBlock}

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
      ...config,
      listStyle: batchStyle,
      responseFormat: config.responseFormat ?? filterResponseFormat,
      logger: lifecycleLogger,
    };

    let response;
    try {
      response = await retry(() => listBatch(items, prompt, listBatchOptions), {
        label: 'filter:batch',
        maxAttempts,
        retryDelay,
        retryOnAll,
        onProgress: tracker.forBatch(startIndex, items.length),
        abortSignal: config.abortSignal,
      });
    } catch (error) {
      lifecycleLogger.logError(error, { batchIndex, itemCount: items.length });
      if (errorPosture === 'strict') throw error;
      continue;
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
