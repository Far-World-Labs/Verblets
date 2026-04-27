import listBatch, { determineStyle } from '../../verblets/list-batch/index.js';
import reduce from '../reduce/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { parallel, retry, createBatches } from '../../lib/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'group';

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
  ({ count }) => {
    const categoryList = categories.join(', ');
    return `Assign each item in the list below to one of these categories:

${asXML(categoryList, { tag: 'categories' })}

Return exactly ${count} category names in the items array, one per input item, in the same order as the input list.`;
  };

const parseCategories = (categoriesString) =>
  categoriesString
    .split(/[,\n]/)
    .map((cat) => cat.trim())
    .filter(Boolean);

const assignItemsToGroups = (batchResults) => {
  const groups = {};
  let droppedLabels = 0;

  for (const { items, labels } of batchResults) {
    labels.forEach((label, idx) => {
      if (label == null) {
        droppedLabels += 1;
        return;
      }
      const key = String(label).trim();
      if (!key) {
        droppedLabels += 1;
        return;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(items[idx]);
    });
  }

  return { groups, droppedLabels };
};

const applyTopNFilter = (groups, topN) => {
  const sortedEntries = Object.entries(groups)
    .toSorted(([, a], [, b]) => b.length - a.length)
    .slice(0, topN);
  return Object.fromEntries(sortedEntries);
};

export default async function group(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['categories']);
  const { text, known, context } = resolveTexts(instructions, ['categories']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  // Empty list short-circuits — documented liberal-accept path
  if (list.length === 0) {
    emitter.complete({
      groupCount: 0,
      totalItems: 0,
      successCount: 0,
      failedItems: 0,
      droppedLabels: 0,
      outcome: Outcome.success,
    });
    return {};
  }
  const {
    guidance: granularityGuidance,
    maxParallel,
    errorPosture,
    topN,
  } = await getOptions(runConfig, {
    granularity: withPolicy(mapGranularity, ['guidance', 'topN']),
    maxParallel: 3,
    errorPosture: ErrorPosture.resilient,
  });
  const { categoryPrompt, listStyle, autoModeThreshold, now } = runConfig;

  let categories;

  if (known.categories) {
    // Caller supplied categories — skip Phase 1 discovery
    categories = parseCategories(known.categories);
  } else {
    // Phase 1: Category Discovery - reduce pass to build taxonomy
    emitter.emit({
      event: DomainEvent.phase,
      phase: 'category-discovery',
      description: 'Discovering categories from items',
    });

    const categoryDiscoveryPrompt = createCategoryDiscoveryPrompt(
      text,
      categoryPrompt,
      granularityGuidance
    );
    const categoriesString = await reduce(list, categoryDiscoveryPrompt, {
      ...runConfig,
      initial: '',
      now,
      onProgress: scopePhase(runConfig.onProgress, 'reduce:category-discovery'),
    });

    categories = parseCategories(categoriesString);
  }

  if (categories.length === 0) {
    const source = known.categories ? 'known.categories' : 'category discovery';
    const err = new Error(`group: no categories available (from ${source})`);
    emitter.error(err);
    throw err;
  }

  // Phase 2: Assignment - map items to established categories
  emitter.emit({
    event: DomainEvent.phase,
    phase: 'assignment',
    description: 'Assigning items to categories',
    categories,
    categoryCount: categories.length,
  });

  const batchResults = [];
  const assignmentFn = createAssignmentInstructions(categories);
  const assignmentInstructions = context
    ? (opts) => `${assignmentFn(opts)}\n\n${context}`
    : assignmentFn;

  const allBatches = await createBatches(list, runConfig);
  const batchesToProcess = allBatches;
  const batchDone = emitter.batch(list.length);

  // Process batches in parallel using parallelBatch
  await parallel(
    batchesToProcess,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

      try {
        const listBatchOptions = {
          ...runConfig,
          listStyle: batchStyle,
        };

        const labels = await retry(
          () => listBatch(items, assignmentInstructions({ count: items.length }), listBatchOptions),
          {
            label: 'group:batch',
            config: runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'assign'),
          }
        );

        if (!Array.isArray(labels) || labels.length !== items.length) {
          throw new Error(
            `group: malformed batch response (expected array of ${items.length}, got ${
              Array.isArray(labels) ? `array of ${labels.length}` : typeof labels
            })`
          );
        }
        batchResults.push({ items, labels, startIndex });

        batchDone(items.length);
      } catch (error) {
        emitter.error(error, { startIndex, itemCount: items.length });
        throw error;
      }
    },
    {
      maxParallel,
      errorPosture,
      label: 'group assignment batches',
      abortSignal: runConfig.abortSignal,
    }
  );

  // Final grouping
  const sorted = batchResults.toSorted((a, b) => a.startIndex - b.startIndex);
  const { groups, droppedLabels } = assignItemsToGroups(sorted);

  const totalAssigned = Object.values(groups).reduce((s, arr) => s + arr.length, 0);

  if (totalAssigned === 0 && list.length > 0) {
    const err = new Error(`group: failed to assign any of ${list.length} items`);
    emitter.error(err);
    throw err;
  }

  const result = topN ? applyTopNFilter(groups, topN) : groups;

  const groupCount = Object.keys(result).length;
  const failedItems = list.length - totalAssigned;
  const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
  emitter.complete({
    groupCount,
    totalItems: list.length,
    successCount: totalAssigned,
    failedItems,
    droppedLabels,
    outcome,
  });

  return result;
}

group.knownTexts = ['categories'];
