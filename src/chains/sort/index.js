import * as R from 'ramda';
import chatGPT from '../../lib/chatgpt/index.js';
import { sort as sortPromptInitial } from '../../prompts/index.js';
import sortSchema from './sort-result.json';

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(llm = 'fastGoodCheap') {
  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'sort_result',
      schema: sortSchema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else {
    return {
      ...llm,
      response_format: responseFormat,
    };
  }
}

// redeclared so it's clearer how tests can override the sorter
let sortPrompt = sortPromptInitial;

export const defaultSortChunkSize = 10;
export const defaultSortExtremeK = 10;
export const defaultSortIterations = 1;

export const useTestSortPrompt = () => {
  sortPrompt = (options, list) => {
    // For testing, return sorted array directly
    // Sort in descending order (z to a) to match test expectations
    return [...list].sort((a, b) => b.localeCompare(a));
  };
};

const sanitizeList = (list) => {
  return [...new Set(list.filter((item) => item.trim() !== ''))];
};

const sort = async (list, criteria, config = {}) => {
  const {
    chunkSize = defaultSortChunkSize,
    extremeK = defaultSortExtremeK,
    iterations = defaultSortIterations,
    selectBottom = true, // New parameter to control bottom selection
    onProgress = undefined, // Callback: ({top, bottom, processed, total}) => void
    llm,
    ...options
  } = config;

  const items = sanitizeList(list);

  // Sort a batch of items with LLM
  const sortBatch = async (batch) => {
    const prompt = sortPrompt({ description: criteria }, batch);

    // Handle test mode where sortPrompt returns the list directly
    if (Array.isArray(prompt)) {
      return prompt;
    }

    const modelOptions = createModelOptions(llm);

    const result = await chatGPT(prompt, {
      modelOptions,
      ...options,
    });

    const resultArray = result?.items || result;
    return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
  };

  // Process one complete pass through all items
  // This maintains running global extremes that compete with each chunk
  const extractExtremes = async (itemsToProcess) => {
    const chunks = R.splitEvery(chunkSize, itemsToProcess);

    // Running global extremes - these represent the best/worst we've seen
    let globalTop = [];
    let globalBottom = [];

    for (const chunk of chunks) {
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
        // Find what's missing
        const missing = itemsToSort.filter((item) => !outputSet.has(item));

        const dedupedSorted = [...outputSet];

        // Add back missing items at the end
        sorted = [...dedupedSorted, ...missing];

        // Final check
        if (sorted.length !== itemsToSort.length && process.env.VERBLETS_DEBUG) {
          console.warn(`Sort mismatch: sent ${itemsToSort.length}, got ${sorted.length}`);
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
    // eslint-disable-next-line no-await-in-loop
    const { top, bottom, selected } = await extractExtremes(remaining);

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

  // Verify we didn't lose any items
  const totalCount = finalTop.length + finalBottom.length + remaining.length;
  if (totalCount !== items.length && process.env.VERBLETS_DEBUG) {
    console.warn(`Sort lost items: started with ${items.length}, ended with ${totalCount}`);
  }

  // Assemble final result
  return selectBottom ? [...finalTop, ...remaining, ...finalBottom] : [...finalTop, ...remaining];
};

export default async function sortWrapper(list, criteria, config = {}) {
  return await sort(list, criteria, config);
}
