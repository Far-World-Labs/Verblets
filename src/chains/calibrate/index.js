import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallel from '../../lib/parallel-batch/index.js';
import map from '../map/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { calibrateSpecificationJsonSchema } from './schemas.js';
import calibrateResultSchema from './calibrate-result.json' with { type: 'json' };

const calibrateBatchSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: calibrateResultSchema,
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const calibrateBatchResponseFormat = jsonSchema('calibrate_batch', calibrateBatchSchema);

const name = 'calibrate';

// ===== Option Mappers =====

/**
 * Map sensitivity option to a classification posture.
 * Accepts 'low'|'high' or passes through directly.
 * low: conservative — prefer false negatives, only flag strong signals.
 * high: sensitive — prefer false positives, flag weak or ambiguous signals.
 * @param {string|undefined} value
 * @returns {string|undefined} 'low'|'high'|undefined
 */
export const mapSensitivity = (value) => {
  if (value === undefined) return undefined;
  if (value === 'low' || value === 'med' || value === 'high') return value;
  return undefined;
};

const VALID_THRESHOLD_STRATEGIES = ['statistical', 'percentile', 'fixed'];

/**
 * Validate scan shape at the chain boundary. Per error-policy: caller-config
 * errors throw rather than silently producing junk statistics.
 * @param {Array} scans - expected shape: [{ flagged, hits: [{ category, score }] }]
 * @param {string} label - error message prefix
 */
function validateScans(scans, label) {
  if (!Array.isArray(scans)) {
    throw new Error(`${label}: scans must be an array (got ${typeof scans})`);
  }
  for (const [i, scan] of scans.entries()) {
    if (!scan || typeof scan !== 'object' || !Array.isArray(scan.hits)) {
      throw new Error(`${label}: scan at index ${i} must be {flagged, hits: Array}`);
    }
    for (const [j, hit] of scan.hits.entries()) {
      if (!hit || typeof hit.category !== 'string' || !Number.isFinite(hit.score)) {
        throw new Error(
          `${label}: scan[${i}].hits[${j}] must be {category: string, score: finite number}`
        );
      }
    }
  }
}

// ===== Statistics =====

/**
 * Compute summary statistics from an array of scan results for the spec prompt.
 * Caller must validate scan shape before calling.
 * @param {Array<{ flagged: boolean, hits: Array<{ category: string, score: number }> }>} scans
 * @returns {object} Statistics object
 */
function computeScanStatistics(scans) {
  const totalScans = scans.length;
  const flaggedScans = scans.filter((s) => s.flagged).length;
  const allHits = scans.flatMap((s) => s.hits);
  const allScores = allHits.map((h) => h.score);

  const categoryCounts = {};
  const categoryScores = {};
  for (const hit of allHits) {
    categoryCounts[hit.category] = (categoryCounts[hit.category] || 0) + 1;
    const scores = categoryScores[hit.category] || [];
    scores.push(hit.score);
    categoryScores[hit.category] = scores;
  }

  const categoryStats = {};
  for (const [category, scores] of Object.entries(categoryScores)) {
    categoryStats[category] = {
      count: categoryCounts[category],
      maxScore: Math.max(...scores),
      meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    };
  }

  return {
    totalScans,
    flaggedScans,
    flaggedPercent: totalScans > 0 ? Math.round((flaggedScans / totalScans) * 100) : 0,
    totalHits: allHits.length,
    scoreRange:
      allScores.length > 0
        ? { min: Math.min(...allScores), max: Math.max(...allScores) }
        : undefined,
    categories: categoryStats,
  };
}

// ===== Core Functions =====

/**
 * Generate a calibration specification from scan results (Pass 1).
 *
 * Computes corpus statistics and asks the LLM to produce a calibrated
 * classification spec — how to assign severity and salience to individual items.
 *
 * @param {Array<{ flagged: boolean, hits: Array }>} scans - Scan results (build with scanVectors + threshold)
 * @param {object} [config]
 * @param {string} [config.instructions] - Domain-specific instructions for spec generation
 * @returns {Promise<{ corpusProfile: string, classificationCriteria: string, salienceCriteria: string, categoryNotes: string }>}
 */
export async function calibrateSpec(scans, config = {}) {
  validateScans(scans, 'calibrateSpec');

  const runConfig = nameStep('calibrate:spec', config);
  const specEmitter = createProgressEmitter('calibrate:spec', runConfig.onProgress, runConfig);
  specEmitter.start();
  const { thresholdStrategy, sensitivity } = await getOptions(runConfig, {
    thresholdStrategy: 'statistical',
    sensitivity: withPolicy(mapSensitivity),
  });

  if (!VALID_THRESHOLD_STRATEGIES.includes(thresholdStrategy)) {
    const err = new Error(
      `calibrateSpec: invalid thresholdStrategy ${JSON.stringify(thresholdStrategy)}, expected one of [${VALID_THRESHOLD_STRATEGIES.join(', ')}]`
    );
    specEmitter.error(err);
    throw err;
  }

  const { instructions } = runConfig;

  const statistics = computeScanStatistics(scans);

  const specSystemPrompt = `You are a calibration specification generator. Analyze the corpus scan statistics and produce a calibrated classification specification. The specification should enable consistent severity and salience classification of individual items relative to this corpus.`;

  const instructionsBlock = instructions
    ? `\n\n${asXML(instructions, { tag: 'classification-instructions' })}`
    : '';

  const thresholdGuidance = {
    percentile:
      '\n- Use percentile-based boundaries (e.g., top 10% = critical, top 25% = high)\n- Calibrate severity thresholds relative to the score distribution\n- Salience should reflect how unusual an item is within its percentile band',
    fixed:
      '\n- Use fixed severity boundaries independent of corpus distribution\n- Apply consistent thresholds regardless of how common or rare detections are\n- Salience should reflect absolute significance, not relative standing',
  };

  const thresholdBlock =
    thresholdStrategy !== 'statistical'
      ? `\n\nThreshold derivation strategy: ${thresholdStrategy}${thresholdGuidance[thresholdStrategy] || thresholdGuidance.fixed}`
      : '';

  const sensitivityPosture = {
    low: '\n\nClassification posture: conservative. Prefer false negatives over false positives. Only flag items with strong, unambiguous signals. Set severity and salience thresholds high — routine items should classify as none/routine unless clearly elevated.',
    high: '\n\nClassification posture: sensitive. Prefer false positives over false negatives. Flag items with even weak or ambiguous signals. Set severity and salience thresholds low to catch edge cases — when in doubt, classify higher.',
  };

  const sensitivityBlock = sensitivityPosture[sensitivity] || '';

  const specUserPrompt = `Analyze these corpus scan statistics and generate a calibration specification.

${asXML(statistics, { tag: 'scan-statistics' })}${instructionsBlock}${thresholdBlock}${sensitivityBlock}

Provide a JSON object with exactly four string properties:
- corpusProfile: Overview of the corpus sensitivity landscape — what categories appear, how prevalent, overall risk profile
- classificationCriteria: How to assign severity (none/low/medium/high/critical) to individual items based on their scan hits
- salienceCriteria: How to determine salience (routine/notable/significant/exceptional) — what makes an item stand out relative to the corpus baseline
- categoryNotes: Per-category observations, calibration notes, and any special handling rules

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

  try {
    const response = await retry(
      () =>
        callLlm(specUserPrompt, {
          ...runConfig,
          systemPrompt: specSystemPrompt,
          responseFormat: jsonSchema(
            calibrateSpecificationJsonSchema.name,
            calibrateSpecificationJsonSchema.schema
          ),
        }),
      {
        label: 'calibrate spec',
        config: runConfig,
      }
    );

    specEmitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    specEmitter.error(err);
    throw err;
  }
}

/**
 * Apply a calibration specification to classify a single scan result (Pass 2).
 *
 * @param {object} scan - A single scan result with { flagged, hits }
 * @param {object} specification - Pre-generated calibration specification from calibrateSpec()
 * @param {object} [config]
 * @returns {Promise<{ severity: string, salience: string, categories: object, summary: string }>}
 */
async function calibrateWithSpec(scan, spec, config = {}) {
  const runConfig = nameStep('calibrate:apply', config);
  const applyEmitter = createProgressEmitter('calibrate:apply', runConfig.onProgress, runConfig);
  applyEmitter.start();

  const prompt = `Classify this scan result against the calibration specification.

${asXML(spec, { tag: 'calibration-specification' })}

${asXML(scan, { tag: 'scan-result' })}

Classify this item according to the specification.
Return a JSON object with:
- severity: one of "none", "low", "medium", "high", "critical"
- salience: one of "routine", "notable", "significant", "exceptional"
- categories: object mapping each detected category to { severity, salience }
- summary: brief explanation of the classification`;

  try {
    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('calibrate_result', calibrateResultSchema),
        }),
      {
        label: 'calibrate classify',
        config: runConfig,
      }
    );

    applyEmitter.complete({ outcome: Outcome.success });
    return response;
  } catch (err) {
    applyEmitter.error(err);
    throw err;
  }
}

// ===== Instruction Builder =====

/**
 * Build an instruction bundle for calibration, usable with any collection chain.
 *
 * @param {object} params
 * @param {string|object} params.spec - Pre-generated calibration specification
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, ...context }
 */
export function calibrateInstructions({ spec, text, ...context }) {
  return {
    text: text ?? 'Classify each item against the calibration specification',
    spec,
    ...context,
  };
}

// ===== Default Export =====

/**
 * Classify a single scan result — generates a spec from the scan if not provided.
 *
 * @param {object} scan - A single scan result from probeScan
 * @param {string|object} instructions - Classification instructions (string or instruction bundle with spec)
 * @param {object} [config]
 * @returns {Promise<{ severity: string, salience: string, categories: object, summary: string }>}
 */
export default async function calibrateItem(scan, instructions, config) {
  validateScans([scan], 'calibrateItem');

  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const spec =
      known.spec ||
      (await calibrateSpec([scan], { ...runConfig, instructions: effectiveInstructions }));
    emitter.emit({ event: DomainEvent.phase, phase: 'applying-calibrate', specification: spec });
    const result = await calibrateWithSpec(scan, spec, runConfig);
    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

calibrateItem.knownTexts = ['spec'];

/**
 * Classify a list of scan results in parallel against one calibration spec.
 *
 * The spec is generated once from the entire corpus (so percentile/statistical
 * thresholds reflect the whole list) and reused for every per-scan apply.
 * Per-scan failures leave that slot as `undefined` rather than throwing —
 * matching the partial-outcome contract used by `mapScore`/`mapTags`.
 *
 * Per-scan dispatch is parallel rather than batched-into-one-prompt; use this
 * when the per-scan output's structure makes batched-LLM responses unreliable.
 *
 * @param {Array<{ flagged: boolean, hits: Array }>} scans - Scan results
 * @param {string|object} instructions - Calibration instructions (string or bundle with `spec`)
 * @param {object} [config={}] - Configuration options (`maxParallel`, `errorPosture`)
 * @returns {Promise<Array<{ severity: string, salience: string, categories: object, summary: string }|undefined>>}
 */
export async function mapCalibrateParallel(scans, instructions, config) {
  validateScans(scans, 'mapCalibrateParallel');

  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;

  const runConfig = nameStep('calibrate:parallel', config);
  const emitter = createProgressEmitter('calibrate:parallel', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: scans });

  try {
    const { maxParallel, errorPosture } = await getOptions(runConfig, {
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });

    const spec =
      known.spec ||
      (await calibrateSpec(scans, {
        ...runConfig,
        instructions: effectiveInstructions,
        onProgress: scopePhase(runConfig.onProgress, 'calibrate:spec'),
      }));

    emitter.emit({ event: DomainEvent.phase, phase: 'applying-calibrate', specification: spec });
    const batchDone = emitter.batch(scans.length);

    const results = new Array(scans.length).fill(undefined);
    const items = scans.map((scan, index) => ({ scan, index }));

    await parallel(
      items,
      async ({ scan, index }) => {
        try {
          results[index] = await calibrateWithSpec(scan, spec, {
            ...runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'calibrate:apply'),
          });
        } catch (error) {
          emitter.error(error, { itemIndex: index });
          if (errorPosture === ErrorPosture.strict) throw error;
        } finally {
          batchDone(1);
        }
      },
      {
        maxParallel,
        errorPosture,
        label: 'calibrate items',
        abortSignal: runConfig.abortSignal,
      }
    );

    const failedItems = results.filter((r) => r === undefined).length;
    if (failedItems === results.length && results.length > 0) {
      throw new Error(`calibrate: all ${results.length} scans failed to classify`);
    }

    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({
      totalItems: results.length,
      successCount: results.length - failedItems,
      failedItems,
      outcome,
    });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

mapCalibrateParallel.knownTexts = ['spec'];

/**
 * Classify a list of scans by packing them into batched LLM prompts (one
 * call per batch). The classification spec is generated once over the full
 * corpus and reused across all batches. Sister to `mapCalibrateParallel`,
 * which sends one LLM call per scan — use the batched form to amortize
 * per-call overhead when scans are uniform enough that the LLM can produce
 * one consistent classification vector per prompt.
 *
 * Failed batches leave their slots as `undefined`; chain reports
 * outcome=partial.
 *
 * @param {Array<{ flagged: boolean, hits: Array }>} scans - Scan results
 * @param {string|object} instructions - Calibration instructions (string or bundle with `spec`)
 * @param {object} [config={}] - `batchSize`, `maxParallel`, `errorPosture`
 * @returns {Promise<Array<object|undefined>>}
 */
export async function mapCalibrate(scans, instructions, config) {
  validateScans(scans, 'mapCalibrate');

  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const effectiveInstructions = context ? `${text}\n\n${context}` : text;

  const runConfig = nameStep('calibrate:map', config);
  const emitter = createProgressEmitter('calibrate:map', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: scans });

  try {
    const spec =
      known.spec ||
      (await calibrateSpec(scans, {
        ...runConfig,
        instructions: effectiveInstructions,
        onProgress: scopePhase(runConfig.onProgress, 'calibrate:spec'),
      }));

    emitter.emit({ event: DomainEvent.phase, phase: 'classifying', specification: spec });

    const mapInstructions = `Classify each scan result against the calibration specification.

${asXML(spec, { tag: 'calibration-specification' })}

For every scan in the input list, return a classification object with:
- severity: one of "none", "low", "medium", "high", "critical"
- salience: one of "routine", "notable", "significant", "exceptional"
- categories: object mapping each detected category to { severity, salience }
- summary: brief explanation of the classification

Return one classification object per input scan, in the same order.`;

    const serializedScans = scans.map((scan) => JSON.stringify(scan));

    const results = await map(serializedScans, mapInstructions, {
      ...runConfig,
      responseFormat: calibrateBatchResponseFormat,
      onProgress: scopePhase(runConfig.onProgress, 'calibrate:map'),
    });

    if (!Array.isArray(results)) {
      throw new Error(
        `calibrate: expected array of classifications from map (got ${typeof results})`
      );
    }

    const failedItems = results.filter((r) => r === undefined).length;
    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    emitter.complete({
      totalItems: results.length,
      successCount: results.length - failedItems,
      failedItems,
      outcome,
    });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

mapCalibrate.knownTexts = ['spec'];
