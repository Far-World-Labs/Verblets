import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';

export default async function reduce(list, instructions, config = {}) {
  const { initial, listStyle, autoModeThreshold, llm, ...options } = config;

  let acc = initial;
  const batches = createBatches(list, config);

  for (const { items, skip } of batches) {
    if (skip) {
      // Skip items that exceed token limits
      continue;
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const reduceInstructions = ({ style, count }) => {
      const baseInstructions = `Start with the given accumulator. Apply the transformation instructions to each item in the list sequentially, using the result as the new accumulator each time. Return only the final accumulator.

<instructions>
${instructions}
</instructions>

<accumulator>
${acc || ''}
</accumulator>`;

      if (style === ListStyle.NEWLINE) {
        return `${baseInstructions}

Process exactly ${count} items from the list below and return the final accumulator value.`;
      }

      return `${baseInstructions}

Process exactly ${count} items from the XML list below and return the final accumulator value.`;
    };

    acc = await retry(
      () =>
        listBatch(items, reduceInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          rawOutput: true, // Return raw output instead of parsing as array
          llm,
          ...options,
        }),
      {
        label: `reduce batch ${items.length} items`,
      }
    );
  }

  return acc;
}
