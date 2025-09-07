import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import reduce from '../reduce/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

const createCategoryDiscoveryPrompt = (instructions, categoryPrompt) => {
  const defaultCategoryPrompt =
    'Build a clean, consistent set of categories. Merge similar categories, standardize naming, remove outliers, and ensure consistent abstraction levels.';
  const mergeInstructions = categoryPrompt || defaultCategoryPrompt;

  return `For each item, determine what category it should belong to according to the grouping instructions. Build and refine a comprehensive category system as you process items.

${asXML(instructions, { tag: 'grouping-criteria' })}

${asXML(mergeInstructions, { tag: 'category-refinement-guidelines' })}

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
  const {
    maxParallel = 3,
    topN,
    categoryPrompt,
    listStyle,
    autoModeThreshold,
    llm,
    ...options
  } = config;

  // Phase 1: Category Discovery - reduce pass to build taxonomy
  const categoryDiscoveryPrompt = createCategoryDiscoveryPrompt(instructions, categoryPrompt);
  const categoriesString = await reduce(list, categoryDiscoveryPrompt, {
    initial: '',
    llm,
    ...options,
  });

  const categories = parseCategories(categoriesString);
  if (categories.length === 0) {
    categories.push('other');
  }

  // Phase 2: Assignment - map items to established categories
  const batches = createBatches(list, config);
  const batchResults = [];
  const assignmentInstructions = createAssignmentInstructions(categories);

  // Filter out skip batches
  const batchesToProcess = batches.filter((batch) => !batch.skip);

  // Process batches in parallel using parallelBatch
  await parallelBatch(
    batchesToProcess,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

      try {
        const listBatchOptions = {
          listStyle: batchStyle,
          autoModeThreshold,
          llm,
          ...options,
        };

        const labels = await retry(
          () => listBatch(items, assignmentInstructions, listBatchOptions),
          {
            label: `group assignment batch ${startIndex}`,
            maxRetries: options.maxAttempts || 3,
            logger: options.logger,
            chatGPTPrompt: `${assignmentInstructions({
              style: batchStyle,
              count: items.length,
            })}\n\nItems: ${JSON.stringify(items).substring(0, 500)}...`,
            chatGPTConfig: listBatchOptions,
          }
        );

        if (!Array.isArray(labels) || labels.length !== items.length) {
          const fallbackLabels = new Array(items.length).fill('other');
          batchResults.push({ items, labels: fallbackLabels, startIndex });
        } else {
          batchResults.push({ items, labels, startIndex });
        }
      } catch {
        const fallbackLabels = new Array(items.length).fill('other');
        batchResults.push({ items, labels: fallbackLabels, startIndex });
      }
    },
    {
      maxParallel,
      label: 'group assignment batches',
    }
  );

  // Final grouping
  batchResults.sort((a, b) => a.startIndex - b.startIndex);
  const groups = assignItemsToGroups(batchResults);

  return topN ? applyTopNFilter(groups, topN) : groups;
}
