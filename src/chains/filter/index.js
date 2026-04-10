import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { filterDecisionsJsonSchema } from './schemas.js';
import { createBatches, retry } from '../../lib/index.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';

const name = 'filter';

// ===== Option Mappers =====

const DEFAULT_STRICTNESS = { guidance: undefined, errorPosture: ErrorPosture.strict };

/**
 * Map strictness option to borderline handling guidance + error posture coordination.
 * low: include when uncertain, resilient error handling (fewer false negatives).
 * high: exclude when uncertain, strict error handling (fewer false positives).
 * med: explicit normal mode — default behavior.
 * @param {string|object|undefined} value
 * @returns {{ guidance: string|undefined, errorPosture: string }}
 */
export const mapStrictness = (value) => {
  if (value === undefined) return DEFAULT_STRICTNESS;
  if (typeof value === 'object') return value;
  return (
    {
      low: {
        guidance:
          'When uncertain whether an item satisfies the criteria, err on the side of inclusion — return "yes". Only exclude items that clearly fail.',
        errorPosture: ErrorPosture.resilient,
      },
      med: DEFAULT_STRICTNESS,
      high: {
        guidance:
          'When uncertain whether an item satisfies the criteria, err on the side of exclusion — return "no". Only include items that clearly pass.',
        errorPosture: ErrorPosture.strict,
      },
    }[value] ?? DEFAULT_STRICTNESS
  );
};

const filterResponseFormat = jsonSchema(
  filterDecisionsJsonSchema.name,
  filterDecisionsJsonSchema.schema
);

const filter = async function filter(list, instructions, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });
  const { guidance, errorPosture } = await getOptions(runConfig, {
    strictness: withPolicy(mapStrictness, ['guidance', 'errorPosture']),
  });
  const results = [];
  let batchErrors = 0;
  const batches = await createBatches(list, runConfig);
  const batchDone = emitter.batch(list.length);

  emitter.progress({
    event: OpEvent.start,
    totalItems: list.length,
    totalBatches: batches.length,
  });

  for (const [batchIndex, { items, skip }] of batches.entries()) {
    if (skip) continue;

    const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);

    const filterInstructions = ({ style, count }) => {
      const strictnessBlock = guidance
        ? `\n\n${asXML(guidance, { tag: 'borderline-handling' })}`
        : '';

      const baseInstructions = `For each item in the list below, determine if it satisfies the filtering criteria. Return "yes" to include the item or "no" to exclude it. Return exactly one decision per item, in the same order as the input list.

${asXML(instructions, { tag: 'filtering-criteria' })}${strictnessBlock}

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

    const prompt = filterInstructions({ style: batchStyle, count: items.length });
    const listBatchOptions = {
      ...runConfig,
      listStyle: batchStyle,
      responseFormat: runConfig.responseFormat ?? filterResponseFormat,
    };

    let response;
    try {
      response = await retry(() => listBatch(items, prompt, listBatchOptions), {
        label: 'filter:batch',
        config: runConfig,
        onProgress: runConfig.onProgress,
        abortSignal: runConfig.abortSignal,
      });
    } catch (error) {
      emitter.error(error, { batchIndex, itemCount: items.length });
      if (errorPosture === ErrorPosture.strict) throw error;
      batchErrors++;
      continue;
    }

    // listBatch now returns arrays directly
    const decisions = response;

    items.forEach((item, i) => {
      const decision = decisions[i]?.toLowerCase().trim();
      if (decision === 'yes') {
        results.push(item);
      }
    });

    batchDone(items.length);
  }

  emitter.progress({
    event: OpEvent.complete,
    totalItems: list.length,
    processedItems: batchDone.count,
  });

  const outcome = batchErrors > 0 ? Outcome.partial : Outcome.success;
  const resultMeta = { inputCount: list.length, outputCount: results.length, outcome };
  emitter.emit({ event: DomainEvent.output, value: results });
  emitter.complete(resultMeta);

  return results;
};

filter.with = function (criteria, config = {}) {
  return async (item) => {
    const results = await filter([item], criteria, config);
    return results.length > 0;
  };
};

export default filter;
