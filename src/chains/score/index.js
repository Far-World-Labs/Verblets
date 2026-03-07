import callLlm from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { scaleSpec } from '../scale/index.js';
import listBatch from '../../verblets/list-batch/index.js';
import {
  emitBatchStart,
  emitBatchComplete,
  emitBatchProcessed,
  emitPhaseProgress,
} from '../../lib/progress-callback/index.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import scoreSingleResultSchema from './score-single-result.json';

const scoreBatchResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'score_batch',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'number' } },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
};

function buildScoringAnchors(items, scores) {
  const paired = items
    .map((item, i) => ({ item: String(item), score: scores[i] }))
    .filter((s) => Number.isFinite(s.score))
    .sort((a, b) => a.score - b.score);
  if (paired.length < 2) return '';
  const count = Math.min(2, Math.ceil(paired.length / 3));
  const anchors = [...paired.slice(0, count), ...paired.slice(-count)];
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
  const { llm, maxAttempts = 3, onProgress, abortSignal, ...options } = config;

  const prompt = `Apply the score specification to evaluate this item.

${asXML(specification, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with a "value" property containing the score from the range.

${asXML(item, { tag: 'item' })}`;

  const llmConfig = {
    llm,
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'score_single_result',
          schema: scoreSingleResultSchema,
        },
      },
    },
    ...options,
  };

  const response = await retry(() => callLlm(prompt, llmConfig), {
    label: 'score item',
    maxAttempts,
    onProgress,
    abortSignal,
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
  const { now = new Date(), ...restConfig } = config;
  const spec = await scoreSpec(instructions, { now, ...restConfig });
  return await applyScore(item, spec, { now, ...restConfig });
}

/**
 * Single scoring pass — processes batches with error containment.
 * First batch runs alone to establish scoring anchors; remaining batches
 * run in parallel with those anchors embedded in the prompt.
 * Failed batches leave items as undefined (never throws).
 */
async function scoreOnce(list, prompt, batchConfig, options) {
  const { maxParallel, maxAttempts, onProgress, abortSignal, now, logger } = options;

  const batches = createBatches(list, batchConfig);
  const batchesToProcess = batches.filter((b) => !b.skip);
  const results = new Array(list.length);
  batches.forEach((b) => {
    if (b.skip) results[b.startIndex] = undefined;
  });

  emitBatchStart(onProgress, 'score', list.length, {
    totalBatches: batchesToProcess.length,
    maxParallel,
    now,
    chainStartTime: now,
  });

  // First batch establishes scoring anchors
  let anchorBlock = '';
  if (batchesToProcess.length > 0) {
    const first = batchesToProcess[0];
    try {
      const scores = await retry(() => listBatch(first.items, prompt, batchConfig), {
        label: 'score:batch',
        maxAttempts,
        onProgress,
        abortSignal,
      });
      alignScores(scores, first.items.length).forEach((s, j) => {
        results[first.startIndex + j] = s;
      });
      anchorBlock = buildScoringAnchors(first.items, scores);
    } catch (error) {
      if (logger?.error)
        logger.error('Score batch 0 failed', {
          error: error.message,
          itemCount: first.items.length,
        });
    }

    emitBatchProcessed(
      onProgress,
      'score',
      {
        totalItems: list.length,
        processedItems: first.items.length,
        batchNumber: 1,
        batchSize: first.items.length,
      },
      { totalBatches: batchesToProcess.length, now: new Date(), chainStartTime: now }
    );
  }

  // Remaining batches run in parallel with anchors
  if (batchesToProcess.length > 1) {
    const anchoredPrompt = anchorBlock ? `${prompt}\n${anchorBlock}` : prompt;
    let processedItems = batchesToProcess[0].items.length;

    await parallel(
      batchesToProcess.slice(1),
      async ({ items, startIndex }, batchIndex) => {
        try {
          const scores = await retry(() => listBatch(items, anchoredPrompt, batchConfig), {
            label: 'score:batch',
            maxAttempts,
            onProgress,
            abortSignal,
          });
          alignScores(scores, items.length).forEach((s, j) => {
            results[startIndex + j] = s;
          });
        } catch (error) {
          if (logger?.error)
            logger.error(`Score batch ${batchIndex + 1} failed`, {
              error: error.message,
              itemCount: items.length,
            });
        }
        processedItems += items.length;

        emitBatchProcessed(
          onProgress,
          'score',
          {
            totalItems: list.length,
            processedItems,
            batchNumber: batchIndex + 2,
            batchSize: items.length,
          },
          { totalBatches: batchesToProcess.length, now: new Date(), chainStartTime: now }
        );
      },
      { maxParallel, label: 'score batches' }
    );
  }

  emitBatchComplete(onProgress, 'score', list.length, {
    totalBatches: batchesToProcess.length,
    now: new Date(),
    chainStartTime: now,
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
  const {
    spec: providedSpec,
    onProgress,
    now = new Date(),
    maxParallel = 3,
    maxAttempts = 3,
    abortSignal,
    llm,
    logger,
    ...restConfig
  } = config;

  emitPhaseProgress(onProgress, 'score', 'generating-specification');
  const spec = providedSpec || (await scoreSpec(instructions, { now, llm, ...restConfig }));
  emitPhaseProgress(onProgress, 'score', 'scoring-items', { specification: spec });

  const scoringPrompt = buildScoringInstructions(
    spec,
    'Return ONLY the numeric score for each item according to the specification range.'
  );
  const batchConfig = {
    ...restConfig,
    responseFormat: scoreBatchResponseFormat,
    llm,
    modelOptions: { temperature: 0 },
    logger,
  };
  const passOptions = { maxParallel, maxAttempts, onProgress, abortSignal, now, logger };

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
  const { now = new Date(), ...restConfig } = config;
  const spec = await scoreSpec(instructions, { now, ...restConfig });
  return async (item) => {
    return await applyScore(item, spec, { now, ...restConfig });
  };
};

// Default export: Score a list of items
export default mapScore;
