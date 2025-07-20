import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { filterDecisionsJsonSchema } from './schemas.js';

const filterResponseFormat = {
  type: 'json_schema',
  json_schema: filterDecisionsJsonSchema,
};

export default async function filter(list, instructions, config = {}) {
  const { listStyle, autoModeThreshold, responseFormat, llm, ...options } = config;

  const results = [];
  const batches = createBatches(list, config);

  for (const { items, skip } of batches) {
    if (skip) {
      continue;
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const filterInstructions = ({ style, count }) => {
      const baseInstructions = `For each item in the list below, determine if it satisfies the filtering criteria. Return "yes" to include the item or "no" to exclude it. Return exactly one decision per item, in the same order as the input list.

${asXML(instructions, { tag: 'filtering-criteria' })}

IMPORTANT: 
- Evaluate each item independently
- Consider all aspects of the filtering criteria
- Return only "yes" or "no" for each item
- Maintain the exact order of the input list`;

      if (style === ListStyle.NEWLINE) {
        return `${baseInstructions}

Process exactly ${count} items from the list below and return ${count} yes/no decisions.`;
      }

      return `${baseInstructions}

Process exactly ${count} items from the XML list below and return ${count} yes/no decisions.`;
    };

    const response = await retry(
      () =>
        listBatch(items, filterInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          responseFormat: responseFormat ?? filterResponseFormat,
          llm,
          ...options,
        }),
      {
        label: `filter batch ${items.length} items`,
      }
    );

    // listBatch now returns arrays directly
    const decisions = response;

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
