import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import retry from '../../lib/retry/index.js';

/**
 * Map over a list of items by calling `listBatch` on XML-enriched batches.
 * Missing or mismatched output results in `undefined` entries so callers can
 * selectively retry.
 *
 * @param { string[] } list - array of items to process
 * @param { string } instructions - mapping instructions passed to `listBatch`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.batchSize] - how many items to send per batch (auto-calculated if not provided)
 * @param { number } [config.maxParallel=3] - maximum parallel requests
 * @param { string } [config.listStyle='auto'] - ListStyle enum value
 * @param { number } [config.autoModeThreshold] - character threshold for auto mode
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<(string|undefined)[]> } results aligned with input order
 */
const mapOnce = async function (list, instructions, config = {}) {
  const { maxParallel = 3, listStyle, autoModeThreshold, llm, ...options } = config;

  const results = new Array(list.length);
  const batches = createBatches(list, config);
  const promises = [];

  for (const { items, startIndex, skip } of batches) {
    if (skip) {
      results[startIndex] = undefined;
      continue;
    }

    const batchStyle = determineStyle(listStyle, items, autoModeThreshold);

    const mappingInstructions = ({ style, count }) => {
      const baseInstructions = `Apply the transformation instructions to each item in the list.

<instructions>
${instructions}
</instructions>`;

      if (style === ListStyle.NEWLINE) {
        return `${baseInstructions}

Return exactly ${count} lines of output, one transformed item per line. Do not number the lines.`;
      }

      return `${baseInstructions}

Return the transformed items as an XML list with exactly ${count} items:
<list>
  <item>transformed content 1</item>
  <item>transformed content 2</item>
  ...
</list>

Preserve all formatting and newlines within each <item> element.`;
    };

    const p = retry(
      () =>
        listBatch(items, mappingInstructions, {
          listStyle: batchStyle,
          autoModeThreshold,
          llm,
          ...options,
        }),
      {
        label: `map batch ${startIndex}-${startIndex + items.length - 1}`,
      }
    )
      .then((output) => {
        output.forEach((item, j) => {
          results[startIndex + j] = item;
        });
      })
      .catch(() => {
        for (let j = 0; j < items.length; j += 1) {
          results[startIndex + j] = undefined;
        }
      });

    promises.push(p);

    if (promises.length >= maxParallel) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  return results;
};

/**
 * Map over a list of items with retry support (default export).
 * Retry undefined results until maxAttempts is reached.
 *
 * @param { string[] } list - array of items
 * @param { string } instructions - mapping instructions passed to `listBatch`
 * @param { object } [config={}] - configuration options
 * @param { number } [config.batchSize] - items per batch (auto-calculated if not provided)
 * @param { number } [config.maxAttempts=3] - maximum retry attempts
 * @param { number } [config.maxParallel=3] - maximum parallel requests
 * @param { string } [config.listStyle='auto'] - ListStyle enum value
 * @param { number } [config.autoModeThreshold] - character threshold for auto mode
 * @param { object } [config.llm] - LLM configuration
 * @returns { Promise<(string|undefined)[]> }
 */
const map = async function (list, instructions, config = {}) {
  const {
    batchSize,
    maxAttempts = 3,
    maxParallel = 3,
    listStyle,
    autoModeThreshold,
    llm,
    ...options
  } = config;

  const results = await mapOnce(list, instructions, {
    batchSize,
    maxParallel,
    listStyle,
    autoModeThreshold,
    llm,
    ...options,
  });

  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingItems = [];

    results.forEach((val, idx) => {
      if (val === undefined) {
        missingIdx.push(idx);
        missingItems.push(list[idx]);
      }
    });

    if (missingItems.length === 0) break;

    const retryResults = await mapOnce(missingItems, instructions, {
      batchSize,
      maxParallel,
      listStyle,
      autoModeThreshold,
      llm,
      ...options,
    });

    retryResults.forEach((val, i) => {
      results[missingIdx[i]] = val;
    });
  }

  return results;
};

export { mapOnce };
export default map;
