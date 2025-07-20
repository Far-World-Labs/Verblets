import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { findResultJsonSchema } from './schemas.js';

const findResponseFormat = {
  type: 'json_schema',
  json_schema: findResultJsonSchema,
};

const find = async function (list, instructions, config = {}) {
  const { maxParallel = 3, listStyle, autoModeThreshold, responseFormat, llm, ...options } = config;

  const batches = createBatches(list, config);
  const findInstructions = ({ style, count }) => {
    const baseInstructions = `From the list below, identify and return the SINGLE item that BEST matches the search criteria. 

${asXML(instructions, { tag: 'search-criteria' })}

IMPORTANT:
- Evaluate all items before selecting
- Choose the BEST match, not just any match
- Return the complete original item text, unchanged
- If NO items match the criteria, return an empty string
- Return ONLY ONE item, even if multiple items match`;

    if (style === ListStyle.NEWLINE) {
      return `${baseInstructions}

Process exactly ${count} items from the list below and return the single best match.`;
    }

    return `${baseInstructions}

Process exactly ${count} items from the XML list below and return the single best match.`;
  };

  const promises = [];
  const results = [];

  for (const { items, startIndex, skip } of batches) {
    if (skip) {
      continue;
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const p = retry(
      () =>
        listBatch(items, findInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          responseFormat: responseFormat || findResponseFormat,
          llm,
          ...options,
        }),
      {
        label: `find batch ${startIndex}-${startIndex + items.length - 1}`,
      }
    )
      .then((result) => {
        // listBatch now returns arrays directly
        const foundItem = Array.isArray(result) && result[0];
        if (foundItem) {
          // Try to find the exact index in the original list
          const itemIndex = list.findIndex((item) => item === foundItem);
          results.push({ result: foundItem, index: itemIndex !== -1 ? itemIndex : startIndex });
        }
      })
      .catch(() => {
        // continue on error
      });

    promises.push(p);

    if (promises.length >= maxParallel) {
      await Promise.all(promises);
      promises.length = 0;

      // Return the item with the earliest index
      if (results.length > 0) {
        const earliest = results.reduce((best, current) =>
          current.index < best.index ? current : best
        );
        return earliest.result;
      }
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Return the item with the earliest index
  if (results.length > 0) {
    const earliest = results.reduce((best, current) =>
      current.index < best.index ? current : best
    );
    return earliest.result;
  }

  return '';
};

export const findOnce = find;
export default find;
