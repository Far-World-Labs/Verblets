import listFind from '../../verblets/list-find/index.js';

export const bulkFind = async function (list, instructions, chunkSize = 10) {
  let candidate = '';
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    const combined = candidate ? [candidate, ...batch] : batch;
    // eslint-disable-next-line no-await-in-loop
    candidate = await listFind(combined, instructions);
  }
  return candidate;
};

export const bulkFindRetry = async function (
  list,
  instructions,
  { chunkSize = 10, maxAttempts = 3 } = {}
) {
  let result;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await bulkFind(list, instructions, chunkSize);
      if (result) break;
    } catch {
      // continue
    }
  }
  return result;
};

export default bulkFind;
