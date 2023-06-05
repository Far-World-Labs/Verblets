import * as R from 'ramda';

import chatGPT from '../../lib/chatgpt/index.js';
import toObject from '../../verblets/to-object/index.js';
import { sort as sortPromptInitial } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';

// redeclared so it's clearer how tests can override the sorter
let sortPrompt = sortPromptInitial;

export const defaultSortChunkSize = 10;
export const defaultSortExtremeK = 10;
export const defaultSortIterations = 1;

// Keeping this here because it's useful for internal debugging
// eslint-disable-next-line no-unused-vars
const assertSorted = (list) => {
  const pairwiseComparisons = R.aperture(2, list);
  if (!R.all(([a, b]) => b.localeCompare(a) <= 0, pairwiseComparisons)) {
    throw new Error(JSON.stringify(list, null, 2));
  }
};

export const useTestSortPrompt = () => {
  sortPrompt = (options, list) => ({ options, list });
};

const sanitizeList = (list) => {
  return [...new Set(list.filter((item) => item.trim() !== ''))];
};

const sort = async (
  options,
  listInitial,
  model = modelService.getBestAvailableModel()
) => {
  const {
    by,
    chunkSize = defaultSortChunkSize,
    extremeK = defaultSortExtremeK,
    iterations = defaultSortIterations,
  } = options;

  const list = sanitizeList(listInitial);
  let i = iterations;
  let top = [];
  let bottom = [];
  let middle = list;

  while (i > 0) {
    let newTop = [];
    let newBottom = [];
    let discardedTop = [];
    let discardedBottom = [];

    for (let j = 0; j < middle.length; j += chunkSize) {
      const batch = middle.slice(j, j + chunkSize);
      const prompt = sortPrompt(
        {
          description: by,
        },
        [...batch, ...newTop, ...newBottom]
      );

      const budget = model.budgetTokens(prompt);

      // eslint-disable-next-line no-await-in-loop
      const result = await chatGPT(prompt, {
        modelOptions: {
          maxTokens: budget.completion,
          requestTimeout: model.requestTimeout * 1.5,
        },
      });

      // eslint-disable-next-line no-await-in-loop
      const batchSorted = await toObject(result);

      const batchTop = batchSorted.slice(0, extremeK);
      const batchBottom = batchSorted.slice(-extremeK);

      discardedTop = [
        ...newTop.filter((x) => !batchTop.includes(x)),
        ...discardedTop,
      ];

      discardedBottom = [
        ...discardedBottom,
        ...newBottom.filter((x) => !batchBottom.includes(x)),
      ];

      newTop = batchTop;
      newBottom = batchBottom;
    }
    top = [...top, ...newTop];
    bottom = [...newBottom, ...bottom];

    const middleOld = middle.filter((x) => {
      return (
        !newTop.includes(x) &&
        !discardedTop.includes(x) &&
        !discardedBottom.includes(x) &&
        !newBottom.includes(x)
      );
    });
    middle = [...discardedTop, ...middleOld, ...discardedBottom];
    i -= 1;
  }

  const finalList = [...top, ...middle, ...bottom];
  return finalList;
};

export default sort;
