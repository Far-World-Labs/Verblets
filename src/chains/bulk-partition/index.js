import listPartition from '../../verblets/list-partition/index.js';
import bulkReduce from '../bulk-reduce/index.js';
import shuffle from 'lodash/shuffle.js';

export default async function bulkPartition(list, instructions, { chunkSize = 10, topN } = {}) {
  const limitText = topN
    ? `Limit to the top ${topN} categories.`
    : 'Return whatever categories feel most natural.';
  const reducePrompt = `Update the accumulator with categories that best satisfy "${instructions}". ${limitText} Return a comma-separated list of categories.`;
  const shuffled = shuffle(list.slice());
  const categoriesStr = await bulkReduce(shuffled, reducePrompt, { chunkSize });
  const categories = categoriesStr
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const partitions = {};
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);

    const result = await listPartition(batch, instructions, categories);
    Object.entries(result).forEach(([key, items]) => {
      if (!partitions[key]) partitions[key] = [];
      partitions[key].push(...items);
    });
  }
  return partitions;
}
