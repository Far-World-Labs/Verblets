import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import reduce from '../reduce/index.js';

const createCategoryDiscoveryPrompt = (instructions, categoryPrompt) => {
  const defaultCategoryPrompt =
    'Build a clean, consistent set of categories. Merge similar categories, standardize naming, remove outliers, and ensure consistent abstraction levels.';
  const mergeInstructions = categoryPrompt || defaultCategoryPrompt;

  return `For each item, determine what category it should belong to according to the grouping instructions. Then update the accumulator with the best set of categories discovered so far.

Grouping instructions: ${instructions}
Category refinement: ${mergeInstructions}

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
  const promises = [];
  const batchResults = [];
  const assignmentInstructions = createAssignmentInstructions(categories);

  for (const { items, startIndex, skip } of batches) {
    if (skip) continue;

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const p = retry(
      () =>
        listBatch(items, assignmentInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          llm,
          ...options,
        }),
      {
        label: `group assignment batch ${startIndex}`,
      }
    )
      .then((labels) => {
        if (!Array.isArray(labels) || labels.length !== items.length) {
          const fallbackLabels = new Array(items.length).fill('other');
          batchResults.push({ items, labels: fallbackLabels, startIndex });
          return;
        }

        batchResults.push({ items, labels, startIndex });
      })
      .catch(() => {
        const fallbackLabels = new Array(items.length).fill('other');
        batchResults.push({ items, labels: fallbackLabels, startIndex });
      });

    promises.push(p);

    if (promises.length >= maxParallel) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Final grouping
  batchResults.sort((a, b) => a.startIndex - b.startIndex);
  const groups = assignItemsToGroups(batchResults);

  return topN ? applyTopNFilter(groups, topN) : groups;
}
