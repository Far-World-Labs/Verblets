import listGroup from '../../verblets/list-group/index.js';

export default async function bulkGroup(list, instructions, config = {}) {
  const { chunkSize = 10, topN, llm, ...options } = config;
  let categories;
  const groups = {};

  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);

    // eslint-disable-next-line no-await-in-loop
    const result = await listGroup(batch, instructions, categories, { llm, ...options });

    // Use categories from first batch for consistency
    if (!categories) {
      categories = Object.keys(result);
    }

    for (const [key, items] of Object.entries(result)) {
      if (!groups[key]) groups[key] = [];
      groups[key].push(...items);
    }
  }

  // Apply topN filtering if specified
  if (topN) {
    const sortedEntries = Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, topN);
    return Object.fromEntries(sortedEntries);
  }

  return groups;
}
