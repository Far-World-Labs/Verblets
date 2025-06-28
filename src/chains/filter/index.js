import listFilterLines from '../../verblets/list-filter-lines/index.js';

const buildMask = async (list, instructions, chunkSize, config = {}) => {
  const mask = new Array(list.length);
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await listFilterLines(batch, instructions, config);
      const valid = result.every((item) => batch.includes(item));
      if (!valid) {
        for (let j = 0; j < batch.length; j += 1) {
          mask[i + j] = undefined;
        }
        continue;
      }
      for (let j = 0; j < batch.length; j += 1) {
        mask[i + j] = result.includes(batch[j]);
      }
    } catch {
      for (let j = 0; j < batch.length; j += 1) {
        mask[i + j] = undefined;
      }
    }
  }
  return mask;
};

const filter = async (list, instructions, config = {}) => {
  const { chunkSize = 10, maxAttempts = 3, llm, ...options } = config;
  const filterConfig = { llm, ...options };
  let mask = await buildMask(list, instructions, chunkSize, filterConfig);
  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingItems = [];
    mask.forEach((val, idx) => {
      if (val === undefined) {
        missingIdx.push(idx);
        missingItems.push(list[idx]);
      }
    });
    if (missingItems.length === 0) break;
    // eslint-disable-next-line no-await-in-loop
    const retryMask = await buildMask(missingItems, instructions, chunkSize, filterConfig);
    retryMask.forEach((val, i) => {
      if (val !== undefined) {
        mask[missingIdx[i]] = val;
      }
    });
  }
  return list.filter((_, idx) => mask[idx]);
};

export const filterOnce = async function (list, instructions, config = {}) {
  const { chunkSize = 10, llm, ...options } = config;
  const mask = await buildMask(list, instructions, chunkSize, { llm, ...options });
  return list.filter((_, idx) => mask[idx]);
};

export default filter;
