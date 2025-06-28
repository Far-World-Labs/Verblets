import listReduceLines from '../../verblets/list-reduce-lines/index.js';

export default async function reduce(list, instructions, config = {}) {
  const { chunkSize = 10, initial, llm, ...options } = config;
  let acc = initial;
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);

    // eslint-disable-next-line no-await-in-loop
    acc = await listReduceLines(acc, batch, instructions, { llm, ...options });
  }
  return acc;
}
