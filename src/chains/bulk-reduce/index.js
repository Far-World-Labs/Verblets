import listReduce from '../../verblets/list-reduce/index.js';

export default async function bulkReduce(list, instructions, { chunkSize = 10, initial } = {}) {
  let acc = initial;
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);

    // eslint-disable-next-line no-await-in-loop
    acc = await listReduce(acc, batch, instructions);
  }
  return acc;
}
