import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

const find = async function (list, instructions, config = {}) {
  const { maxParallel = 3, listStyle, autoModeThreshold, llm, ...options } = config;

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
          rawOutput: true,
          llm,
          ...options,
        }),
      {
        label: `find batch ${startIndex}-${startIndex + items.length - 1}`,
      }
    )
      .then((result) => {
        const trimmed = result.trim();
        if (trimmed) {
          const itemIndex = list.indexOf(trimmed);
          if (itemIndex >= 0) {
            results.push({ result: trimmed, itemIndex });
          }
        }
      })
      .catch(() => {
        // continue on error
      });

    promises.push(p);

    if (promises.length >= maxParallel) {
      await Promise.all(promises);
      promises.length = 0;

      // Check if we found anything and return the earliest
      if (results.length > 0) {
        const earliest = results.reduce((best, current) =>
          current.itemIndex < best.itemIndex ? current : best
        );
        return earliest.result;
      }
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Return the earliest result if any found
  if (results.length > 0) {
    const earliest = results.reduce((best, current) =>
      current.itemIndex < best.itemIndex ? current : best
    );
    return earliest.result;
  }

  return '';
};

export const findOnce = find;
export default find;
