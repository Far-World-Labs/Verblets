import listGroupBy from '../../verblets/list-group-by/index.js';

export default async function bulkGroupBy(list, instructions, { chunkSize = 10 } = {}) {
  const groups = {};
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const batchGroups = await listGroupBy(batch, instructions);
    Object.entries(batchGroups).forEach(([key, items]) => {
      if (!groups[key]) groups[key] = [];
      groups[key].push(...items);
    });
  }
  return groups;
}
