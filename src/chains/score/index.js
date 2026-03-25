import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { scaleSpec } from '../scale/index.js';
import listBatch from '../../verblets/list-batch/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import scoreSingleResultSchema from './score-single-result.json';

const name = 'score';

// ===== Option Mappers =====

/**
 * Map anchoring option to an anchor-building strategy.
 * Accepts 'low'|'high' or passes through a string directly.
 * low: no anchors — all batches scored independently.
 * high: richer anchors — extremes plus median items from the first batch.
 * @param {string|undefined} value
 * @returns {string} 'none'|'default'|'rich'
 */
export const mapAnchoring = (value) => {
  if (value === undefined) return 'default';
  return { low: 'none', med: 'default', high: 'rich' }[value] ?? 'default';
};

const scoreBatchSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'number' } },
  },
  required: ['items'],
  additionalProperties: false,
};

const scoreBatchResponseFormat = jsonSchema('score_batch', scoreBatchSchema);

function buildScoringAnchors(items, scores, anchoring = 'default') {
  if (anchoring === 'none') return '';

  const paired = items
    .map((item, i) => ({ item: String(item), score: scores[i] }))
    .filter((s) => Number.isFinite(s.score))
    .sort((a, b) => a.score - b.score);
  if (paired.length < 2) return '';

  let anchors;
  if (anchoring === 'rich') {
    // More anchors: extremes plus median for tighter calibration
    const count = Math.min(3, Math.ceil(paired.length / 4));
    const mid = Math.floor(paired.length / 2);
    const medianItems = paired.slice(Math.max(0, mid - 1), mid + 1);
    const combined = [...paired.slice(0, count), ...medianItems, ...paired.slice(-count)];
    // Deduplicate by item text
    const seen = new Set();
    anchors = combined.filter((a) => {
      if (seen.has(a.item)) return false;
      seen.add(a.item);
      return true;
    });
  } else {
    const count = Math.min(2, Math.ceil(paired.length / 3));
    anchors = [...paired.slice(0, count), ...paired.slice(-count)];
  }

  return `\nUse these scored examples as reference points:\n${asXML(
    anchors.map((a) => `${a.score} — ${a.item}`).join('\n'),
    { tag: 'scoring-anchors' }
  )}`;
}

function alignScores(scores, expectedLength) {
  const arr = Array.isArray(scores) ? scores : [];
  if (arr.length === expectedLength) return arr;
  return Array.from({ length: expectedLength }, (_, i) =>
    i < arr.length && typeof arr[i] === 'number' ? arr[i] : undefined
  );
}

// ===== Core Functions =====

/**
 * Default spec generator - uses scaleSpec from scale verblet
 */
export const scoreSpec = scaleSpec;

/**
 * Apply a score specification to a single item
 * @param {*} item - Item to score
 * @param {Object} specification - Pre-generated score specification
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<*>} Score value (type depends on specification range)
 */
export async function applyScore(item, specification, config = {}) {
  config = nameStep('score:item', config);

  const prompt = `Apply the score specification to evaluate this item.

${asXML(specification, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with a "value" property containing the score from the range.

${asXML(item, { tag: 'item' })}`;

  const llmConfig = {
    ...config,
    response_format: jsonSchema('score_single_result', scoreSingleResultSchema),
  };

  const response = await retry(() => callLlm(prompt, llmConfig), {
    label: 'score item',
    config,
  });

  // llm auto-unwraps single value property, returns the number directly
  return response;
}

/**
 * Score a single item
 * @param {*} item - Item to score
 * @param {string} instructions - Scoring instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Score value
 */
export async function scoreItem(item, instructions, config = {}) {
  const spec = await scoreSpec(instructions, config);
  return await applyScore(item, spec, config);
}

/**
 * Single scoring pass — processes batches with error containment.
 * First batch runs alone to establish scoring anchors; remaining batches
 * run in parallel with those anchors embedded in the prompt.
 * Failed batches leave items as undefined (never throws).
 */
async function scoreOnce(list, prompt, batchConfig, config) {
  const { maxParallel, errorPosture, onProgress, logger, anchoring } = config;

  const batches = await createBatches(list, batchConfig);
  const batchesToProcess = batches.filter((b) => !b.skip);
  const results = new Array(list.length);
  batches.forEach((b) => {
    if (b.skip) results[b.startIndex] = undefined;
  });

  const emitter = createProgressEmitter('score', onProgress);
  const batchDone = emitter.batch(list.length);
  emitter.emit({
    event: 'start',
    totalItems: list.length,
    totalBatches: batchesToProcess.length,
    maxParallel,
  });

  // First batch establishes scoring anchors
  let anchorBlock = '';
  if (batchesToProcess.length > 0) {
    const first = batchesToProcess[0];
    try {
      const scores = await retry(() => listBatch(first.items, prompt, batchConfig), {
        label: 'score:batch',
        config,
      });
      alignScores(scores, first.items.length).forEach((s, j) => {
        results[first.startIndex + j] = s;
      });
      anchorBlock = buildScoringAnchors(first.items, scores, anchoring);
    } catch (error) {
      if (errorPosture === 'strict') throw error;
      if (logger?.error)
        logger.error('Score batch 0 failed', {
          error: error.message,
          itemCount: first.items.length,
        });
    }

    batchDone(first.items.length);
  }

  // Remaining batches run in parallel with anchors
  if (batchesToProcess.length > 1) {
    const anchoredPrompt = anchorBlock ? `${prompt}\n${anchorBlock}` : prompt;

    await parallel(
      batchesToProcess.slice(1),
      async ({ items, startIndex }) => {
        try {
          const scores = await retry(() => listBatch(items, anchoredPrompt, batchConfig), {
            label: 'score:batch',
            config,
          });
          alignScores(scores, items.length).forEach((s, j) => {
            results[startIndex + j] = s;
          });
        } catch (error) {
          if (errorPosture === 'strict') throw error;
          if (logger?.error)
            logger.error(`Score batch failed`, {
              error: error.message,
              itemCount: items.length,
            });
        }

        batchDone(items.length);
      },
      { maxParallel, errorPosture, label: 'score batches' }
    );
  }

  emitter.emit({
    event: 'complete',
    totalItems: list.length,
    processedItems: batchDone.count,
  });

  return results;
}

/**
 * Score a list of items
 * @param {Array} list - Array of items
 * @param {string} instructions - Scoring instructions
 * @param {Object} config - Configuration options
 * @param {Object} config.spec - Optional pre-built spec (skips scoreSpec LLM call)
 * @returns {Promise<Array>} Array of scores
 */
export async function mapScore(list, instructions, config = {}) {
  const { spec: providedSpec, now } = config;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { maxParallel, maxAttempts, temperature, errorPosture, anchoring } = await getOptions(
    runConfig,
    {
      maxParallel: 3,
      maxAttempts: 3,
      temperature: 0,
      errorPosture: 'resilient',
      anchoring: withPolicy(mapAnchoring),
    }
  );
  emitter.emit({ event: 'phase', phase: 'generating-specification' });
  const spec = providedSpec || (await scoreSpec(instructions, runConfig));
  emitter.emit({ event: 'phase', phase: 'scoring-items', specification: spec });

  const scoringPrompt = buildScoringInstructions(
    spec,
    'Return ONLY the numeric score for each item according to the specification range.'
  );
  const batchConfig = {
    ...runConfig,
    responseFormat: scoreBatchResponseFormat,
    temperature,
  };
  const passOptions = {
    ...runConfig,
    maxParallel,
    maxAttempts,
    errorPosture,
    now,
    anchoring,
  };

  const results = await scoreOnce(list, scoringPrompt, batchConfig, passOptions);

  // Retry undefined items (follows map chain's retry pattern)
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

    const retryResults = await scoreOnce(missingItems, scoringPrompt, batchConfig, {
      ...passOptions,
      now: new Date(),
    });

    retryResults.forEach((val, i) => {
      if (val !== undefined) results[missingIdx[i]] = val;
    });
  }

  emitter.complete();

  return results;
}

// ===== Instruction Builders =====

/**
 * Build scoring instructions with common prefix and specification
 * @param {Object} specification - The score specification
 * @param {string} additionalInstructions - Additional instructions for specific operation
 * @returns {string} Complete instruction string
 */
function buildScoringInstructions(specification, additionalInstructions = '') {
  const base = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}`;

  return additionalInstructions ? `${base}\n\n${additionalInstructions}` : base;
}

/**
 * Create map instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @returns {string} Instructions string
 */
export function mapInstructions({ specification }) {
  return buildScoringInstructions(
    specification,
    'Return ONLY the score value from the range for each item, nothing else.'
  );
}

/**
 * Create filter instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - Which items to keep (e.g., "scores above 7", "only perfect scores")
 * @returns {string} Instructions string
 */
export function filterInstructions({ specification, processing }) {
  const filterContext = `<filter-condition>
${processing}
</filter-condition>`;

  return `${buildScoringInstructions(specification)}\n\n${filterContext}`;
}

/**
 * Create reduce instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - How to reduce the scores (e.g., "sum all scores", "find highest score with its item")
 * @returns {string} Instructions string
 */
export function reduceInstructions({ specification, processing }) {
  const reduceContext = `<reduce-operation>
${processing}

Process each item by:
1. Applying the score specification to get a numeric score
2. Using that score in the reduction operation
3. Accumulating results across all items
4. Returning the final reduced value
</reduce-operation>`;

  return `${buildScoringInstructions(specification)}\n\n${reduceContext}`;
}

/**
 * Create find instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - Which item to select (e.g., "highest scoring", "first above threshold 8")
 * @returns {string} Instructions string
 */
export function findInstructions({ specification, processing }) {
  const findContext = `<selection-criteria>
${processing}
</selection-criteria>`;

  return `${buildScoringInstructions(specification)}\n\n${findContext}`;
}

/**
 * Create group instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - How to group by scores (e.g., "low (0-3), medium (4-7), high (8-10)")
 * @returns {string} Instructions string
 */
export function groupInstructions({ specification, processing }) {
  const groupContext = `<grouping-strategy>
${processing}
</grouping-strategy>`;

  return `${buildScoringInstructions(specification)}\n\n${groupContext}`;
}

mapScore.with = async function (instructions, config = {}) {
  const spec = await scoreSpec(instructions, config);
  return async (item) => {
    return await applyScore(item, spec, config);
  };
};

// Default export: Score a list of items
export default mapScore;
