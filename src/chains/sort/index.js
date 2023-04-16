import * as R from 'ramda';

import chatGPT from '../../lib/openai/completions.js';
import {
  wrapVariable,
} from '../../prompts/fragment-functions/index.js'
import {
  onlyJSONStringArray,
} from '../../prompts/fragment-texts/index.js'
import {
  toObject,
} from '../../response-parsers/index.js';

export const defaultSortChunkSize = 20;
export const defaultSortExtremeK = 20;
export const defaultSortIterations = 1;
export const defaultSortDescription = 'alphabetically';

// Keeping this here because it's useful for internal debugging
const assertSorted = (list) => {
  const pairwiseComparisons = R.aperture(2, list);
  if (!R.all(([a, b]) => b.localeCompare(a) <= 0, pairwiseComparisons)) {
    throw new Error(JSON.stringify(list, null, 2));
  };
};

let sortPrompt = ({ description=defaultSortDescription, fixes='' }, list) => {
  const listLines = JSON.stringify(list, undefined, 2);

  return `
Sort the following items by: ${wrapVariable(description)}

The items to sort:
======
${listLines}
======

Details:
 - descending order

Fixes:
${wrapVariable(fixes)}

${onlyJSONStringArray}
`
};

export const useTestSortPrompt = () => {
  sortPrompt = (options, list) => ({ options, list });
}


const sanitizeList = (list) => {
  return [...new Set(list.filter((item) => item.trim() !== ''))];
};

const sort = async (options, listInitial) => {
  const {
    by = defaultSortDescription,
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
    let newMiddle = [];
    let discardedTop = [];
    let discardedBottom = [];

    for (let j = 0; j < middle.length; j += chunkSize) {
      const batch = middle.slice(j, j + chunkSize);
      const prompt = sortPrompt({
        description: by
      }, [...batch, ...newTop, ...newBottom]);

      const batchSorted = toObject(await chatGPT(prompt, { maxTokens: 2000 }));

      const batchTop = batchSorted.slice(0, extremeK);
      const batchBottom = batchSorted.slice(-extremeK);
      const remaining = batchSorted.slice(extremeK, -extremeK);

      discardedTop = [
        ...newTop.filter((x) => !batchTop.includes(x)),
        ...discardedTop,
      ];

      discardedBottom = [
        ...discardedBottom,
        ...newBottom.filter((x) => !batchBottom.includes(x))
      ];

      newTop = batchTop;
      newBottom = batchBottom;
    }
    top = [...top, ...newTop];
    bottom = [...newBottom, ...bottom];

    const middleOld = middle.filter(x => {
      return !newTop.includes(x) &&
        !discardedTop.includes(x) &&
        !discardedBottom.includes(x) &&
        !newBottom.includes(x);
    });
    middle = [
      ...discardedTop,
      ...middleOld,
      ...discardedBottom,
    ];
    i--;
  }

  const finalList = [...top, ...middle, ...bottom];
  return finalList;
};

export default sort;
