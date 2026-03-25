import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { chunk } from '../../lib/pure/index.js';
import retry from '../../lib/retry/index.js';
import { sort as sortPromptInitial } from '../../prompts/index.js';
import sortSchema from './sort-result.json';
import createProgressEmitter from '../../lib/progress/index.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';

const name = 'sort';

// ===== Option Mappers =====

/**
 * Map effort option to a sorting posture coordinating iterations, extremeK, and selectBottom.
 * low: one pass, small extremes window, top-only — fast, rough ordering.
 * high: multiple passes, larger extremes window, both ends — expensive, precise full ordering.
 * @param {string|object|undefined} value
 * @returns {{ iterations: number, extremeK: number, selectBottom: boolean }}
 */
export const mapEffort = (value) => {
  if (value === undefined) return { iterations: 1, extremeK: 10, selectBottom: true };
  if (typeof value === 'object') return value;
  return (
    {
      low: { iterations: 1, extremeK: 5, selectBottom: false },
      med: { iterations: 1, extremeK: 10, selectBottom: true },
      high: { iterations: 2, extremeK: 15, selectBottom: true },
    }[value] ?? { iterations: 1, extremeK: 10, selectBottom: true }
  );
};

const sortResponseFormat = jsonSchema('sort_result', sortSchema);

// redeclared so it's clearer how tests can override the sorter
let sortPrompt = sortPromptInitial;

export const defaultSortBatchSize = 10;
export const defaultSortExtremeK = 10;
export const defaultSortIterations = 1;

export const useTestSortPrompt = () => {
  sortPrompt = (options, list) => {
    // For testing, return sorted array directly
    // Sort in descending order (z to a) to match test expectations
    return list.toSorted((a, b) => b.localeCompare(a));
  };
};

const sanitizeList = (list) => {
  return [...new Set(list.filter((item) => item.trim() !== ''))];
};

const sort = async (list, criteria, config = {}) => {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  const { batchSize, extremeK, iterations, selectBottom } = await getOptions(runConfig, {
    effort: withPolicy(mapEffort, ['extremeK', 'iterations', 'selectBottom']),
    batchSize: defaultSortBatchSize,
  });
  const { onProgress } = runConfig;
  const items = sanitizeList(list);

  emitter.emit({
    event: 'start',
    totalItems: items.length,
    batchSize,
    extremeK,
    iterations,
    criteria,
  });

  // Sort a batch of items with LLM
  const sortBatch = async (batch) => {
    const prompt = sortPrompt({ description: criteria }, batch);

    // Handle test mode where sortPrompt returns the list directly
    if (Array.isArray(prompt)) {
      return prompt;
    }

    const result = await retry(
      () => callLlm(prompt, { ...runConfig, response_format: sortResponseFormat }),
      {
        label: 'sort-batch',
        config: runConfig,
        onProgress,
      }
    );

    const resultArray = result?.items || result;
    return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
  };

  // Process one complete pass through all items
  // This maintains running global extremes that compete with each chunk
  const extractExtremes = async (itemsToProcess, iterationNumber) => {
    const chunks = chunk(batchSize)(itemsToProcess);

    // Running global extremes - these represent the best/worst we've seen
    let globalTop = [];
    let globalBottom = [];
    let processedChunks = 0;

    for (const chunk of chunks) {
      emitter.emit({
        event: 'step',
        stepName: 'sorting-chunk',
        iteration: iterationNumber,
        chunkNumber: processedChunks + 1,
        totalChunks: chunks.length,
        batchSize: chunk.length,
      });
      // Current chunk competes with the global extremes
      const itemsToSort = [...chunk, ...globalTop, ...(selectBottom ? globalBottom : [])];

      // eslint-disable-next-line no-await-in-loop
      let sorted = await sortBatch(itemsToSort);

      // Critical: ensure the sorted output contains exactly the items we sent
      // LLMs can sometimes duplicate or drop items
      const inputSet = new Set(itemsToSort);
      const outputSet = new Set(sorted);

      // If sizes don't match, we have duplicates or missing items
      if (sorted.length !== itemsToSort.length || outputSet.size !== inputSet.size) {
        // Find what's missing from the input
        const missing = itemsToSort.filter((item) => !outputSet.has(item));

        // Keep only items that were in the original input (filter out hallucinated items)
        const dedupedSorted = sorted.filter(
          (item, idx, arr) => inputSet.has(item) && arr.indexOf(item) === idx
        );

        // Add back missing items at the end
        sorted = [...dedupedSorted, ...missing];

        // Final check
        if (sorted.length !== itemsToSort.length) {
          debug(`Sort mismatch: sent ${itemsToSort.length}, got ${sorted.length}`);
        }
      }

      // Update global extremes with the best K from this sort
      globalTop = sorted.slice(0, Math.min(extremeK, sorted.length));
      if (selectBottom) {
        // Take bottom K items, ensuring no overlap with top
        const availableForBottom = Math.max(0, sorted.length - globalTop.length);
        const bottomSliceSize = Math.min(extremeK, availableForBottom);
        globalBottom = bottomSliceSize > 0 ? sorted.slice(-bottomSliceSize) : [];
      }

      processedChunks++;
    }

    // After seeing all chunks, we have the true global extremes
    return {
      top: globalTop,
      bottom: selectBottom ? globalBottom : [],
      selected: new Set([...globalTop, ...(selectBottom ? globalBottom : [])]),
    };
  };

  // Main algorithm: iteratively extract extremes
  const finalTop = [];
  const finalBottom = [];
  let remaining = items;

  for (let iter = 0; iter < iterations && remaining.length > 0; iter++) {
    emitter.emit({
      event: 'step',
      stepName: 'extracting-extremes',
      iteration: iter + 1,
      totalIterations: iterations,
      remainingItems: remaining.length,
    });

    // eslint-disable-next-line no-await-in-loop
    const { top, bottom, selected } = await extractExtremes(remaining, iter + 1);

    // Accumulate results
    finalTop.push(...top);
    if (selectBottom) {
      // For bottom items, prepend to maintain correct order
      // Items from later iterations are "less bad" than earlier ones
      finalBottom.unshift(...bottom);
    }

    // Remove selected items for next iteration
    remaining = remaining.filter((item) => !selected.has(item));

    // Progress callback after each complete iteration
    if (onProgress) {
      onProgress({
        top: finalTop,
        bottom: finalBottom,
        iteration: iter + 1,
        remaining: remaining.length,
      });
    }
  }

  // Assemble final result, ensuring we return exactly the original items
  // LLMs may slightly modify strings, so reconcile against the original item set
  const assembled = selectBottom
    ? [...finalTop, ...remaining, ...finalBottom]
    : [...finalTop, ...remaining];

  const itemSet = new Set(items);
  const seen = new Set();
  const result = [];

  // First pass: keep items that are in the original set, deduplicating
  for (const item of assembled) {
    if (itemSet.has(item) && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }

  // Second pass: add any original items that were lost (append at end)
  for (const item of items) {
    if (!seen.has(item)) {
      result.push(item);
    }
  }

  emitter.emit({
    event: 'complete',
    totalItems: items.length,
    iterations,
    topItems: finalTop.length,
    bottomItems: finalBottom.length,
    remainingItems: remaining.length,
  });

  emitter.result();

  return result;
};

export default sort;
