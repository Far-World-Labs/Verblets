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

export function aggregateScoreVectors(vectors, weights) {
  if (!vectors || vectors.length === 0) return [];
  const criteriaCount = vectors.find((v) => Array.isArray(v))?.length ?? 0;
  if (criteriaCount === 0) return vectors.map(() => undefined);
  const effectiveWeights = weights ?? Array.from({ length: criteriaCount }, () => 1);
  const weightSum = effectiveWeights.reduce((sum, w) => sum + w, 0);
  return vectors.map((v) => {
    if (!Array.isArray(v)) return undefined;
    return v.reduce((sum, s, i) => sum + s * (effectiveWeights[i] / weightSum), 0);
  });
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
  const results = new Array(list.length).fill(undefined);

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
  emitter.emit({ event: DomainEvent.input, value: list });
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

const scoreWithUncertaintySchema = {
  type: 'object',
  properties: {
    value: { type: 'number' },
    confidence: { type: 'number' },
    unknowns: { type: 'array', items: { type: 'string' } },
  },
  required: ['value', 'confidence', 'unknowns'],
  additionalProperties: false,
};

/**
 * Score a single item with structured uncertainty metadata.
 * Returns the score alongside confidence and unknowns in a single LLM call.
 * @param {*} item - Item to score
 * @param {string|object} instructions - Scoring instructions (string or bundle with known keys: spec, anchors)
 * @param {Object} config - Configuration options
 * @returns {Promise<{ score: number, uncertainty: { confidence: number, unknowns: string[] } }>}
 */
export async function scoreItemWithUncertainty(item, instructions, config = {}) {
  [instructions, config] = resolveArgs(instructions, config, ['spec', 'anchors']);
  const { text, known, context } = resolveTexts(instructions, ['spec', 'anchors']);
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;
  const spec = known.spec || (await scoreSpec(effectiveInstructions, config));

  const runConfig = nameStep('score:uncertainty', config);
  const emitter = createProgressEmitter('score:uncertainty', runConfig.onProgress, runConfig);
  emitter.start();

  const prompt = `Apply the score specification to evaluate this item.

${asXML(spec, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with:
- "value": the numeric score from the specification range
- "confidence": your confidence in this score (0.0 to 1.0)
- "unknowns": factors that make the score uncertain (array of strings)

${asXML(item, { tag: 'item' })}`;

  const llmConfig = {
    ...runConfig,
    responseFormat: jsonSchema('score_with_uncertainty', scoreWithUncertaintySchema),
  };

  const response = await retry(() => callLlm(prompt, llmConfig), {
    label: 'score:uncertainty',
    config: runConfig,
  });

  const uncertainty = { confidence: response.confidence, unknowns: response.unknowns };
  emitter.uncertainty(uncertainty);
  emitter.complete({ outcome: Outcome.success });

  return { score: response.value, uncertainty };
}

/**
 * Iterative self-refinement loop: evaluate items, refine based on scores, repeat.
 * Generates the scoring specification once and reuses it across all iterations.
 * Terminates when scores converge or maxIterations is reached.
 *
 * @param {Array} items - Initial items to evaluate
 * @param {string|object} instruction - Scoring instructions (string or bundle with known keys: spec, anchors)
 * @param {Object} config - Configuration options
 * @param {Function} config.refine - async (items, scores, { iteration, averageScore }) => refinedItems
 * @param {number} [config.maxIterations=3] - Maximum number of evaluate-refine cycles
 * @param {number} [config.convergenceThreshold=0.01] - Minimum average score change to continue
 * @returns {Promise<{ items: Array, scores: Array, iterations: number }>}
 */
export async function iterativeScoreLoop(items, instruction, config) {
  [instruction, config] = resolveArgs(instruction, config, ['spec', 'anchors']);
  const { text, known, context } = resolveTexts(instruction, ['spec', 'anchors']);

  const runConfig = nameStep('score:refine-loop', config);

  const { refine } = runConfig;
  if (typeof refine !== 'function') {
    throw new Error('iterativeScoreLoop requires a refine function on config');
  }

  const emitter = createProgressEmitter('score:refine-loop', runConfig.onProgress, runConfig);
  emitter.start();

  const { maxIterations, convergenceThreshold } = await getOptions(runConfig, {
    maxIterations: 3,
    convergenceThreshold: 0.01,
  });

  emitter.emit({ event: DomainEvent.phase, phase: 'generating-specification' });
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;
  const spec = known.spec || (await scoreSpec(effectiveInstructions, runConfig));
  const scoringBundle = scoreInstructions({ spec, anchors: known.anchors });

  let currentItems = items;
  let currentScores;
  let previousAvg;
  let iteration = 0;

  while (iteration < maxIterations) {
    emitter.emit({ event: DomainEvent.tick, phase: 'scoring', iteration });

    currentScores = await mapScore(currentItems, scoringBundle, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, `iteration-${iteration}`),
    });

    const validScores = currentScores.filter((s) => s !== undefined);
    const currentAvg =
      validScores.length > 0 ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length : 0;

    iteration += 1;

    emitter.emit({
      event: DomainEvent.tick,
      phase: 'scored',
      iteration,
      averageScore: currentAvg,
    });

    if (previousAvg !== undefined && Math.abs(currentAvg - previousAvg) < convergenceThreshold) {
      emitter.emit({ event: DomainEvent.phase, phase: 'converged', iteration });
      break;
    }

    if (iteration >= maxIterations) break;

    previousAvg = currentAvg;

    emitter.emit({ event: DomainEvent.tick, phase: 'refining', iteration });
    currentItems = await refine(currentItems, currentScores, {
      iteration,
      averageScore: currentAvg,
    });
  }

  const successCount = currentScores.filter((s) => s !== undefined).length;
  const outcome = successCount === currentItems.length ? Outcome.success : Outcome.partial;

  emitter.complete({
    totalItems: currentItems.length,
    totalIterations: iteration,
    successCount,
    outcome,
  });

  return { items: currentItems, scores: currentScores, iterations: iteration };
}

iterativeScoreLoop.knownTexts = ['spec', 'anchors'];
mapScore.knownTexts = ['spec', 'anchors'];

// Default export: Score a list of items
export default mapScore;
