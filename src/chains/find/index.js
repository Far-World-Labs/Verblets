import listFindLines from '../../verblets/list-find-lines/index.js';

export const findOnce = async function (list, instructions, config = {}) {
  const { chunkSize = 10, llm, ...options } = config;
  let candidate = '';
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    const combined = candidate ? [candidate, ...batch] : batch;
    // eslint-disable-next-line no-await-in-loop
    candidate = await listFindLines(combined, instructions, { llm, ...options });
  }
  return candidate;
};

const find = async function (list, instructions, config = {}) {
  const { chunkSize = 10, maxAttempts = 3, llm, ...options } = config;
  let result;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await findOnce(list, instructions, { chunkSize, llm, ...options });
      if (result) break;
    } catch {
      // continue
    }
  }
  return result;
};

export default find;
