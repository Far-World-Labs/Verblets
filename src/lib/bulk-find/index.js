import listFind from '../../verblets/list-find/index.js';

/**
 * Search a list in batches using `listFind`.
 *
 * @param { string[] } list - array of items to search
 * @param { string } instructions - criteria passed to `listFind`
 * @param { number } [chunkSize=10] - how many items per batch
 * @returns { Promise<string|undefined> } first match or undefined
 */
export default async function bulkFind(list, instructions, chunkSize = 10) {
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    try {
      const result = await listFind(batch, instructions);
      if (result) return result;
    } catch {
      // ignore and continue to next batch
    }
  }
  return undefined;
}

export async function bulkFindRetry(list, instructions, { chunkSize = 10, maxAttempts = 3 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await bulkFind(list, instructions, chunkSize);
    if (result) return result;
  }
  return undefined;
}
