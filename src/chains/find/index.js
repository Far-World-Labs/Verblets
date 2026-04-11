import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { findResultJsonSchema } from './schemas.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';

const name = 'find';

const findResponseFormat = jsonSchema(findResultJsonSchema.name, findResultJsonSchema.schema);

const find = async function find(list, instructions, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });
  const { maxParallel, errorPosture } = await getOptions(runConfig, {
    maxParallel: 3,
    errorPosture: ErrorPosture.resilient,
  });
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

  const results = [];
  let foundEarly = false;

  const batches = await createBatches(list, runConfig);
  const batchDone = emitter.batch(list.length);
  const batchesToProcess = batches;

  emitter.progress({
    event: OpEvent.start,
    totalItems: list.length,
    totalBatches: batchesToProcess.length,
  });

  // Process in chunks to allow early termination
  for (let i = 0; i < batchesToProcess.length && !foundEarly; i += maxParallel) {
    const chunk = batchesToProcess.slice(i, i + maxParallel);

    await parallel(
      chunk,
      async ({ items, startIndex }) => {
        const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);

        try {
          const result = await retry(
            () =>
              listBatch(items, findInstructions({ style: batchStyle, count: items.length }), {
                ...runConfig,
                listStyle: batchStyle,
                responseFormat: runConfig.responseFormat || findResponseFormat,
              }),
            {
              label: 'find:batch',
              config: runConfig,
              onProgress: scopePhase(runConfig.onProgress, 'batch'),
            }
          );

          // listBatch now returns arrays directly
          const foundItem = Array.isArray(result) && result[0];
          if (foundItem) {
            // Try to find the exact index in the original list
            const itemIndex = list.findIndex((item) => item === foundItem);
            const matchIndex = itemIndex !== -1 ? itemIndex : startIndex;
            results.push({ result: foundItem, index: matchIndex });
          }

          batchDone(items.length);
        } catch (error) {
          emitter.error(error, { startIndex, itemCount: items.length });
          if (errorPosture === ErrorPosture.strict) throw error;
          debug(`find batch at index ${startIndex} failed: ${error.message}`);
        }
      },
      {
        maxParallel,
        errorPosture,
        label: 'find batches',
        abortSignal: runConfig.abortSignal,
      }
    );

    // Check for early termination after each chunk
    if (results.length > 0) {
      foundEarly = true;
    }
  }

  emitter.progress({
    event: OpEvent.complete,
    totalItems: list.length,
    processedItems: batchDone.count,
    found: results.length > 0,
  });

  if (results.length > 0) {
    const earliest = results.reduce((best, current) =>
      current.index < best.index ? current : best
    );
    const foundMeta = { found: true, totalItems: list.length, outcome: Outcome.success };
    emitter.emit({ event: DomainEvent.output, value: earliest.result });
    emitter.complete(foundMeta);
    return earliest.result;
  }

  const notFoundMeta = { found: false, totalItems: list.length, outcome: Outcome.success };
  emitter.emit({ event: DomainEvent.output, value: '' });
  emitter.complete(notFoundMeta);
  return '';
};

export default find;
