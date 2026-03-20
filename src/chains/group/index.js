import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { emitPhaseProgress } from '../../lib/progress-callback/index.js';
import { createBatches, parallel, retry, batchTracker, scopeProgress } from '../../lib/index.js';
import { debug } from '../../lib/debug/index.js';
import { getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';

// ===== Option Mappers =====

const DEFAULT_GRANULARITY = { guidance: undefined, topN: undefined };

/**
 * Map granularity option to category discovery guidance + topN coordination.
 * low: fewer, broader categories — merge aggressively, lower topN.
 * high: finer-grained categories — preserve distinctions, higher topN.
 * med: explicit normal mode — default behavior, existing topN.
 * @param {string|object|undefined} value
 * @returns {{ guidance: string|undefined, topN: number|undefined }}
 */
export const mapGranularity = (value) => {
  if (value === undefined) return DEFAULT_GRANULARITY;
  if (typeof value === 'object') return value;
  return (
    {
      low: {
        guidance:
          'Prefer fewer, broader categories. Merge aggressively — only keep categories that are clearly distinct. Aim for high-level groupings.',
        topN: 5,
      },
      med: DEFAULT_GRANULARITY,
      high: {
        guidance:
          'Prefer finer-grained categories. Preserve subtle distinctions between items. Only merge categories that are nearly identical.',
        topN: 20,
      },
    }[value] ?? DEFAULT_GRANULARITY
  );
};

const createCategoryDiscoveryPrompt = (instructions, categoryPrompt, granularityGuidance) => {
  const defaultCategoryPrompt =
    'Build a clean, consistent set of categories. Merge similar categories, standardize naming, remove outliers, and ensure consistent abstraction levels.';
  const mergeInstructions = categoryPrompt || defaultCategoryPrompt;

  const granularityBlock = granularityGuidance
    ? `\n\n${asXML(granularityGuidance, { tag: 'granularity-guidance' })}`
    : '';

  return `For each item, determine what category it should belong to according to the grouping instructions. Build and refine a comprehensive category system as you process items.

${asXML(instructions, { tag: 'grouping-criteria' })}

${asXML(mergeInstructions, { tag: 'category-refinement-guidelines' })}${granularityBlock}

PROCESS:
1. Examine each new item against the grouping criteria
2. Determine what category it belongs to (create new categories as needed)
3. Update the accumulator with the refined set of categories by:
   - Merging similar or overlapping categories
   - Standardizing category names for consistency
   - Maintaining appropriate abstraction levels
   - Removing overly specific or rare categories

OUTPUT FORMAT:
The accumulator should contain a comma-separated list of the current best category names.`;
};

const createAssignmentInstructions =
  (categories) =>
  ({ style, count }) => {
    const baseInstructions = `Assign each item in the list below to one of these categories: ${categories.join(
      ', '
    )}

Return exactly ${count} category names, one per line, in the same order as the input items.`;

    if (style === ListStyle.NEWLINE) {
      return `${baseInstructions}

Process exactly ${count} items from the list below.`;
    }

    return `${baseInstructions}

Process exactly ${count} items from the XML list below.`;
  };

const parseCategories = (categoriesString) =>
  categoriesString
    .split(/[,\n]/)
    .map((cat) => cat.trim())
    .filter(Boolean);

const assignItemsToGroups = (batchResults) => {
  const groups = {};

  for (const { items, labels } of batchResults) {
    labels.forEach((label, idx) => {
      const key = String(label).trim() || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(items[idx]);
    });
  }

  return groups;
};

const applyTopNFilter = (groups, topN) => {
  const sortedEntries = Object.entries(groups)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, topN);
  return Object.fromEntries(sortedEntries);
};

export default async function group(list, instructions, config = {}) {
  config = scopeOperation('group', config);
  const { categoryPrompt, listStyle, autoModeThreshold, onProgress, now } = config;
  const {
    guidance: granularityGuidance,
    maxParallel,
    errorPosture,
    progressMode,
    topN,
  } = await getOptions(config, {
    granularity: withPolicy(mapGranularity, ['guidance', 'topN']),
    maxParallel: 3,
    errorPosture: 'resilient',
    progressMode: 'detailed',
  });

  // Phase 1: Category Discovery - reduce pass to build taxonomy
  if (onProgress) {
    emitPhaseProgress(onProgress, 'group', 'category-discovery', {
      description: 'Discovering categories from items',
      now: new Date(),
      chainStartTime: now,
    });
  }

  const categoryDiscoveryPrompt = createCategoryDiscoveryPrompt(
    instructions,
    categoryPrompt,
    granularityGuidance
  );
  const categoriesString = await reduce(list, categoryDiscoveryPrompt, {
    ...config,
    initial: '',
    now,
    onProgress: scopeProgress(onProgress, 'reduce:category-discovery'),
  });

  const categories = parseCategories(categoriesString);
  if (categories.length === 0) {
    categories.push('other');
  }

  // Phase 2: Assignment - map items to established categories
  if (onProgress) {
    emitPhaseProgress(onProgress, 'group', 'assignment', {
      description: 'Assigning items to categories',
      categoryCount: categories.length,
      now: new Date(),
      chainStartTime: now,
    });
  }

  const batches = await createBatches(list, config);
  const batchResults = [];
  const assignmentInstructions = createAssignmentInstructions(categories);

  // Filter out skip batches
  const batchesToProcess = batches.filter((batch) => !batch.skip);

  const tracker = batchTracker('group', list.length, { onProgress, progressMode, now });

  tracker.start(batchesToProcess.length, maxParallel);

  // Process batches in parallel using parallelBatch
  await parallel(
    batchesToProcess,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

      try {
        const listBatchOptions = {
          ...config,
          listStyle: batchStyle,
        };

        const labels = await retry(
          () =>
            listBatch(
              items,
              assignmentInstructions({ style: batchStyle, count: items.length }),
              listBatchOptions
            ),
          {
            label: 'group:batch',
            config,
            onProgress: tracker.forBatch(startIndex, items.length),
          }
        );

        if (!Array.isArray(labels) || labels.length !== items.length) {
          const fallbackLabels = new Array(items.length).fill('other');
          batchResults.push({ items, labels: fallbackLabels, startIndex });
        } else {
          batchResults.push({ items, labels, startIndex });
        }

        tracker.batchDone(startIndex, items.length);
      } catch (error) {
        if (errorPosture === 'strict') throw error;
        debug(`group batch at index ${startIndex} failed, using fallback labels: ${error.message}`);
        const fallbackLabels = new Array(items.length).fill('other');
        batchResults.push({ items, labels: fallbackLabels, startIndex });
      }
    },
    {
      maxParallel,
      errorPosture,
      label: 'group assignment batches',
    }
  );

  // Final grouping
  batchResults.sort((a, b) => a.startIndex - b.startIndex);
  const groups = assignItemsToGroups(batchResults);

  tracker.complete({ categoryCount: categories.length });

  return topN ? applyTopNFilter(groups, topN) : groups;
}
