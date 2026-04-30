import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import bool from '../../verblets/bool/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { findResultJsonSchema } from './schemas.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'find';

const findResponseFormat = jsonSchema(findResultJsonSchema.name, findResultJsonSchema.schema);

const find = async function find(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });
  const { maxParallel, errorPosture } = await getOptions(runConfig, {
    maxParallel: 3,
    errorPosture: ErrorPosture.resilient,
  });
  const findInstructions = ({ style, count }) => {
    const contextBlock = context ? `\n\n${context}` : '';
    const baseInstructions = `From the list below, identify and return the SINGLE item that BEST matches the search criteria.

${asXML(text, { tag: 'search-criteria' })}

IMPORTANT:
- Evaluate all items before selecting
- Choose the BEST match, not just any match
- Return the complete original item text, unchanged
- If NO items match the criteria, return an empty string
- Return ONLY ONE item, even if multiple items match${contextBlock}`;

    if (style === ListStyle.NEWLINE) {
      return `${baseInstructions}

Process exactly ${count} items from the list below and return the single best match.`;
    }

    return `${baseInstructions}

Process exactly ${count} items from the XML list below and return the single best match.`;
  };

  const results = [];
  let foundEarly = false;
  let batchesRun = 0;
  let batchesFailed = 0;

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
        batchesRun += 1;
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
            // Resolve match index. If the LLM returned text that doesn't match
            // any input verbatim, use Infinity so it loses any "earliest match"
            // tie-break against real exact matches in the same chunk.
            const itemIndex = list.findIndex((item) => item === foundItem);
            const matchIndex = itemIndex !== -1 ? itemIndex : Infinity;
            results.push({ result: foundItem, index: matchIndex });
          }

          batchDone(items.length);
        } catch (error) {
          batchesFailed += 1;
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

  // All batches failed → throw rather than silently returning '' indistinguishable
  // from a genuine no-match.
  if (batchesRun > 0 && batchesRun === batchesFailed) {
    const err = new Error(`find: all ${batchesRun} batches failed`);
    emitter.error(err);
    throw err;
  }

  // Some batches failed but others succeeded → result is degraded (search was
  // incomplete; better matches may have been in the failed batches).
  const outcome = batchesFailed > 0 ? Outcome.degraded : Outcome.success;

  if (results.length > 0) {
    const earliest = results.reduce((best, current) =>
      current.index < best.index ? current : best
    );
    emitter.emit({ event: DomainEvent.output, value: earliest.result });
    emitter.complete({
      found: true,
      totalItems: list.length,
      batchesRun,
      batchesFailed,
      outcome,
    });
    return earliest.result;
  }

  emitter.emit({ event: DomainEvent.output, value: '' });
  emitter.complete({
    found: false,
    totalItems: list.length,
    batchesRun,
    batchesFailed,
    outcome,
  });
  return '';
};

find.knownTexts = [];

// Per-item form: a yes/no decision over a single item. find selects the best
// match within a list; for one item the question collapses to a boolean
// "does this match", so we re-export bool rather than duplicate it.
export { default as findItem } from '../../verblets/bool/index.js';

/**
 * Find the first matching item by running one bool call per item with managed
 * concurrency and chunk-by-chunk early termination.
 *
 * Use this when batched-LLM find smears items together or when you want
 * cleaner per-item decisions. Items are processed in chunks of `maxParallel`;
 * after each chunk completes, if any item in it matched, we return the
 * earliest-index match found so far and skip the remaining chunks. Within a
 * single chunk we still wait for all calls to settle so the index ordering is
 * deterministic — same contract the batched form provides.
 *
 * @param {Array} list - Items to search
 * @param {string|object} instructions - Search criteria
 * @param {object} [config={}] - `maxParallel`, `errorPosture`
 * @returns {Promise<*>} First matching item, or '' when no match
 */
const findParallel = async function findParallel(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  if (!Array.isArray(list)) {
    throw new Error(
      `findParallel: list must be an array (got ${list === null ? 'null' : typeof list})`
    );
  }
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep('find:parallel', config);
  const emitter = createProgressEmitter('find:parallel', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  try {
    const { maxParallel, errorPosture } = await getOptions(runConfig, {
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });
    const contextBlock = context ? `\n\n${context}` : '';

    const decisions = new Array(list.length).fill(undefined);
    let itemsFailed = 0;
    let matchIndex;

    // Process in chunks so we can short-circuit once any chunk produces a match.
    // Within a chunk we still settle all pending calls so the earliest-index
    // tie-break is stable — matches the batched form's semantics.
    for (let start = 0; start < list.length; start += maxParallel) {
      const chunk = list.slice(start, start + maxParallel).map((value, offset) => ({
        value,
        index: start + offset,
      }));

      await parallel(
        chunk,
        async ({ value, index }) => {
          const itemSerialized = typeof value === 'string' ? value : JSON.stringify(value);
          const question = `Decide whether the item below matches the search criteria.

${asXML(text, { tag: 'search-criteria' })}

${asXML(itemSerialized, { tag: 'item' })}${contextBlock}`;

          try {
            const matched = await bool(question, {
              ...runConfig,
              onProgress: scopePhase(runConfig.onProgress, 'item'),
            });
            decisions[index] = matched === true;
          } catch (error) {
            itemsFailed += 1;
            emitter.error(error, { itemIndex: index });
            if (errorPosture === ErrorPosture.strict) throw error;
          }
        },
        {
          maxParallel,
          errorPosture,
          abortSignal: runConfig.abortSignal,
          label: 'find parallel items',
        }
      );

      const earliestInChunk = chunk.find(({ index }) => decisions[index] === true)?.index;
      if (earliestInChunk !== undefined) {
        matchIndex = earliestInChunk;
        break;
      }
    }

    if (matchIndex === undefined && itemsFailed > 0 && itemsFailed === list.length) {
      throw new Error(`findParallel: all ${list.length} items failed to evaluate`);
    }

    const outcome = itemsFailed > 0 ? Outcome.degraded : Outcome.success;
    if (matchIndex !== undefined) {
      const result = list[matchIndex];
      emitter.emit({ event: DomainEvent.output, value: result });
      emitter.complete({
        found: true,
        totalItems: list.length,
        itemsFailed,
        outcome,
      });
      return result;
    }

    emitter.emit({ event: DomainEvent.output, value: '' });
    emitter.complete({ found: false, totalItems: list.length, itemsFailed, outcome });
    return '';
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

findParallel.knownTexts = [];

export { findParallel };

export default find;
