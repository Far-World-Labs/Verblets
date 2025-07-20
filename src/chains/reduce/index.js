import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { isSimpleCollectionSchema } from '../../lib/chatgpt/index.js';
import { reduceAccumulatorJsonSchema } from './schemas.js';

// Default response format for reduce operations - simple string accumulator
const DEFAULT_REDUCE_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: reduceAccumulatorJsonSchema,
};

export default async function reduce(list, instructions, config = {}) {
  const { initial, listStyle, autoModeThreshold, responseFormat, llm, ...options } = config;

  let acc = initial;

  // If initial is an array and we're using default format, wrap it
  const needsItemsWrapper = Array.isArray(initial) && !responseFormat;
  if (needsItemsWrapper) {
    acc = { items: initial };
  }

  const batches = createBatches(list, config);

  for (const { items, skip } of batches) {
    if (skip) {
      // Skip items that exceed token limits
      continue;
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const reduceInstructions = ({ style, count }) => {
      const itemFormat = style === ListStyle.XML ? 'XML' : '';

      return `Start with the given accumulator. Apply the transformation instructions to each item in the list sequentially, using the result as the new accumulator each time. Return only the final accumulator.

Example: If reducing ["one", "two", "three"] with "sum the numeric values" and initial value 0:
- Start: 0
- Process "one": 0 + 1 = 1
- Process "two": 1 + 2 = 3
- Process "three": 3 + 3 = 6
- Return: 6

${asXML(instructions, { tag: 'instructions' })}

${asXML(
  acc !== undefined && acc !== null ? acc : 'No initial value - use first item as starting point',
  { tag: 'accumulator' }
)}

Process exactly ${count} items from the ${itemFormat} list below and return the final accumulator value.`;
    };

    const effectiveResponseFormat = responseFormat || DEFAULT_REDUCE_RESPONSE_FORMAT;

    const result = await retry(
      () =>
        listBatch(items, reduceInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          responseFormat: effectiveResponseFormat,
          llm,
          ...options,
        }),
      {
        label: `reduce batch ${items.length} items`,
      }
    );

    if (!responseFormat && result?.accumulator !== undefined) {
      acc = result.accumulator;
    } else if (responseFormat && isSimpleCollectionSchema(responseFormat)) {
      // Handle simple collection schemas - reduce should work with arrays directly
      acc = result;
    } else {
      acc = result;
    }
  }

  return acc;
}
