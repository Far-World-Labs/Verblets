import listBatch, { ListStyle, determineStyle } from '../../verblets/list-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { filterDecisionsJsonSchema } from './schemas.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

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

const filter = async function filter(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['guidance']);
  const { text, known, context } = resolveTexts(instructions, ['guidance']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });
  const {
    guidance: mapperGuidance,
    errorPosture,
    maxParallel = 3,
  } = await getOptions(runConfig, {
    strictness: withPolicy(mapStrictness, ['guidance', 'errorPosture']),
  });
  const guidance = known.guidance ?? mapperGuidance;
  const decisions = Array.from({ length: list.length }, () => undefined);
  const batches = await createBatches(list, runConfig);
  const batchDone = emitter.batch(list.length);

  emitter.progress({
    event: OpEvent.start,
    totalItems: list.length,
    totalBatches: batches.length,
  });

  const filterInstructions = ({ style, count }) => {
    const strictnessBlock = guidance
      ? `\n\n${asXML(guidance, { tag: 'borderline-handling' })}`
      : '';
    const contextBlock = context ? `\n\n${context}` : '';

    const baseInstructions = `For each item in the list below, determine if it satisfies the filtering criteria. Return "yes" to include the item or "no" to exclude it. Return exactly one decision per item, in the same order as the input list.

${asXML(text, { tag: 'filtering-criteria' })}${strictnessBlock}

IMPORTANT:
- Evaluate each item independently
- Consider all aspects of the filtering criteria
- Return only "yes" or "no" for each item
- Maintain the exact order of the input list${contextBlock}`;

    if (style === ListStyle.NEWLINE) {
      return `${baseInstructions}

Process exactly ${count} items from the list below and return ${count} yes/no decisions.`;
    }

    return `${baseInstructions}

Process exactly ${count} items from the XML list below and return ${count} yes/no decisions.`;
  };

  await parallel(
    batches,
    async ({ items, startIndex }) => {
      const batchStyle = determineStyle(runConfig.listStyle, items, runConfig.autoModeThreshold);
      const prompt = filterInstructions({ style: batchStyle, count: items.length });
      const listBatchOptions = {
        ...runConfig,
        listStyle: batchStyle,
        responseFormat: runConfig.responseFormat ?? filterResponseFormat,
      };

      try {
        const response = await retry(() => listBatch(items, prompt, listBatchOptions), {
          label: 'filter:batch',
          config: runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'batch'),
        });

        if (!Array.isArray(response)) {
          throw new Error(`filter: expected decisions array from LLM (got ${typeof response})`);
        }
        if (response.length !== items.length) {
          throw new Error(
            `filter: LLM returned ${response.length} decisions for ${items.length} items`
          );
        }
        for (let i = 0; i < items.length; i++) {
          decisions[startIndex + i] = response[i]?.toLowerCase().trim() === 'yes';
        }

        batchDone(items.length);
      } catch (error) {
        if (error.name === 'AbortError' || runConfig?.abortSignal?.aborted) throw error;
        if (errorPosture === ErrorPosture.strict) throw error;

        emitter.error(error, { startIndex, itemCount: items.length });
        // Leave decisions for this batch undefined so the partial-outcome
        // detector below sees the unfilled slots. Items are excluded from
        // results because `list.filter((_, i) => decisions[i])` treats
        // undefined as falsy — but the chain reports outcome=partial,
        // distinguishing "excluded after a failure" from "excluded by LLM".
        batchDone(items.length);
      }
    },
    {
      maxParallel,
      errorPosture,
      abortSignal: runConfig.abortSignal,
      label: 'filter batches',
    }
  );

  const results = list.filter((_, i) => decisions[i]);

  emitter.progress({
    event: OpEvent.complete,
    totalItems: list.length,
    processedItems: batchDone.count,
  });

  const outcome = decisions.some((d) => d === undefined) ? Outcome.partial : Outcome.success;
  const resultMeta = { inputCount: list.length, outputCount: results.length, outcome };
  emitter.emit({ event: DomainEvent.output, value: results });
  emitter.complete(resultMeta);

  return results;
};

filter.knownTexts = ['guidance'];

export default filter;
