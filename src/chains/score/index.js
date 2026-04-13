import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { scaleSpec } from '../scale/index.js';
import listBatch from '../../verblets/list-batch/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { createBatches, parallel, retry } from '../../lib/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import scoreSingleResultSchema from './score-single-result.json' with { type: 'json' };

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
    .toSorted((a, b) => a.score - b.score);
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
async function scoreWithSpec(item, spec, config = {}) {
  const runConfig = nameStep('score:item', config);

  const prompt = `Apply the score specification to evaluate this item.

${asXML(spec, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with a "value" property containing the score from the range.

${asXML(item, { tag: 'item' })}`;

  const llmConfig = {
    ...runConfig,
    responseFormat: jsonSchema('score_single_result', scoreSingleResultSchema),
  };

  const response = await retry(() => callLlm(prompt, llmConfig), {
    label: 'score item',
    config: runConfig,
  });

  // llm auto-unwraps single value property, returns the number directly
  return response;
}

/**
 * Score a single item
 * @param {*} item - Item to score
 * @param {string|object} instructions - Scoring instructions (string or bundle with known keys: spec, anchors)
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Score value
 */
export async function scoreItem(item, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec', 'anchors']);
  const { text, known, context } = resolveTexts(instructions, ['spec', 'anchors']);
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;
  const spec = known.spec || (await scoreSpec(effectiveInstructions, config));
  return scoreWithSpec(item, spec, config);
}

/**
 * Single scoring pass — processes batches with error containment.
 * First batch runs alone to establish scoring anchors; remaining batches
 * run in parallel with those anchors embedded in the prompt.
 * Failed batches leave items as undefined (never throws).
 */
async function scoreOnce(list, prompt, batchConfig, config) {
  const { maxParallel, errorPosture, onProgress, logger, anchoring, _providedAnchors } = config;

  const batches = await createBatches(list, batchConfig);
  const batchesToProcess = batches;
  const results = new Array(list.length);

  const emitter = createProgressEmitter('score', onProgress, config);
  const batchDone = emitter.batch(list.length);
  emitter.progress({
    event: OpEvent.start,
    totalItems: list.length,
    totalBatches: batchesToProcess.length,
    maxParallel,
  });

  // First batch establishes scoring anchors (skipped when anchors are pre-supplied)
  let anchorBlock = _providedAnchors || '';
  if (!_providedAnchors && batchesToProcess.length > 0) {
    const first = batchesToProcess[0];
    try {
      const scores = await retry(() => listBatch(first.items, prompt, batchConfig), {
        label: 'score:batch',
        config,
        onProgress: scopePhase(onProgress, 'batch'),
      });
      alignScores(scores, first.items.length).forEach((s, j) => {
        results[first.startIndex + j] = s;
      });
      anchorBlock = buildScoringAnchors(first.items, scores, anchoring);
      emitter.emit({
        event: DomainEvent.phase,
        phase: 'anchors-established',
        anchors: anchorBlock,
      });
    } catch (error) {
      emitter.error(error, { batchIndex: 0, itemCount: first.items.length });
      if (errorPosture === ErrorPosture.strict) throw error;
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
            onProgress: scopePhase(onProgress, 'batch'),
          });
          alignScores(scores, items.length).forEach((s, j) => {
            results[startIndex + j] = s;
          });
        } catch (error) {
          emitter.error(error, { itemCount: items.length });
          if (errorPosture === ErrorPosture.strict) throw error;
          if (logger?.error)
            logger.error(`Score batch failed`, {
              error: error.message,
              itemCount: items.length,
            });
        }

        batchDone(items.length);
      },
      { maxParallel, errorPosture, label: 'score batches', abortSignal: config.abortSignal }
    );
  }

  emitter.progress({
    event: OpEvent.complete,
    totalItems: list.length,
    processedItems: batchDone.count,
  });

  return results;
}

/**
 * Score a list of items
 * @param {Array} list - Array of items
 * @param {string|object} instructions - Scoring instructions (string or bundle with known keys: spec, anchors)
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of scores
 */
export async function mapScore(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec', 'anchors']);
  const { text, known, context } = resolveTexts(instructions, ['spec', 'anchors']);
  const { now } = config;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { maxParallel, maxAttempts, temperature, errorPosture, anchoring } = await getOptions(
    runConfig,
    {
      maxParallel: 3,
      maxAttempts: 3,
      temperature: 0,
      errorPosture: ErrorPosture.resilient,
      anchoring: withPolicy(mapAnchoring),
    }
  );
  emitter.emit({ event: DomainEvent.phase, phase: 'generating-specification' });
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;
  const spec = known.spec || (await scoreSpec(effectiveInstructions, runConfig));
  emitter.emit({ event: DomainEvent.phase, phase: 'scoring-items', specification: spec });

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
    _providedAnchors: known.anchors,
  };

  const results = await scoreOnce(list, scoringPrompt, batchConfig, passOptions);

  // Retry undefined items (follows map chain's retry pattern)
  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    const missingIdx = [];
    const missingItems = [];

    results.forEach((val, idx) => {
      if (val == null) {
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

  const successCount = results.filter((r) => r !== undefined).length;
  const failedItems = results.length - successCount;
  const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
  emitter.complete({ totalItems: results.length, successCount, failedItems, outcome });

  return results;
}

// ===== Instruction Builders =====

/**
 * Build scoring instructions with common prefix and specification
 * @param {Object} specification - The score specification
 * @param {string} additionalInstructions - Additional instructions for specific operation
 * @returns {string} Complete instruction string
 */
function buildScoringInstructions(spec, additionalInstructions = '') {
  const base = `Apply this score specification to evaluate each item:

${asXML(spec, { tag: 'score-specification' })}`;

  return additionalInstructions ? `${base}\n\n${additionalInstructions}` : base;
}

/**
 * Build an instruction bundle for scoring, usable with any collection chain.
 *
 * Returns an instruction object that resolveTexts can process:
 * - When consumed by score(), `spec` and `anchors` are known keys → skip derivation
 * - When consumed by map/filter/group/etc., they become XML context
 *
 * @param {object} params
 * @param {string|object} params.spec - Pre-generated score specification
 * @param {string} [params.anchors] - Pre-generated scoring anchors
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, anchors?, ...context }
 */
export function scoreInstructions({ spec, anchors, text, ...context }) {
  return {
    text: text ?? 'Evaluate each item against the score specification and return a numeric score',
    spec,
    ...(anchors ? { anchors } : {}),
    ...context,
  };
}

mapScore.knownTexts = ['spec', 'anchors'];

// Default export: Score a list of items
export default mapScore;
