import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { calibrateSpecificationJsonSchema } from './schemas.js';
import calibrateResultSchema from './calibrate-result.json' with { type: 'json' };

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

// ===== Statistics =====

/**
 * Compute summary statistics from an array of scan results for the spec prompt.
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
  const runConfig = nameStep('calibrate:spec', config);
  const specEmitter = createProgressEmitter('calibrate:spec', runConfig.onProgress, runConfig);
  specEmitter.start();
  const { thresholdStrategy, sensitivity } = await getOptions(runConfig, {
    thresholdStrategy: 'statistical',
    sensitivity: withPolicy(mapSensitivity),
  });
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
export default async function calibrate(scan, instructions, config) {
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

calibrate.knownTexts = ['spec'];
