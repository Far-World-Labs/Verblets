import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';

export default async function filter(list, instructions, config = {}) {
  const { listStyle, autoModeThreshold, llm, ...options } = config;

  const results = [];
  const batches = createBatches(list, config);

  for (const { items, skip } of batches) {
    if (skip) {
      continue;
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const filterInstructions = ({ style, count }) => {
      const baseInstructions = `For each item in the list below, determine if it satisfies the instructions. Return "yes" or "no" for each item, one per line.

<instructions>
${instructions}
</instructions>`;

      if (style === ListStyle.NEWLINE) {
        return `${baseInstructions}

Process exactly ${count} items from the list below and return ${count} yes/no decisions.`;
      }

      return `${baseInstructions}

Process exactly ${count} items from the XML list below and return ${count} yes/no decisions.`;
    };

    const decisions = await retry(
      () =>
        listBatch(items, filterInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          llm,
          ...options,
        }),
      {
        label: `filter batch ${items.length} items`,
      }
    );

    items.forEach((item, i) => {
      const decision = decisions[i]?.toLowerCase().trim();
      if (decision === 'yes') {
        results.push(item);
      }
    });
  }

  return results;
}

export const filterOnce = filter;
