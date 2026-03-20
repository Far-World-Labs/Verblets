import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';
import { calibrateSpecificationJsonSchema } from './schemas.js';
import calibrateResultSchema from './calibrate-result.json';

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
 * @param {Array<{ flagged: boolean, hits: Array }>} scans - Scan results from probeScan
 * @param {object} [config]
 * @param {string} [config.instructions] - Domain-specific instructions (e.g. "Classify sensitivity risk in medical records")
 * @returns {Promise<{ corpusProfile: string, classificationCriteria: string, salienceCriteria: string, categoryNotes: string }>}
 */
export async function calibrateSpec(scans, config = {}) {
  config = scopeOperation('calibrate:spec', config);
  const { instructions } = config;
  const { thresholdStrategy, sensitivity } = await getOptions(config, {
    thresholdStrategy: 'statistical',
    sensitivity: withPolicy(mapSensitivity),
  });

  const statistics = computeScanStatistics(scans);

  const specSystemPrompt = `You are a calibration specification generator. Analyze the corpus scan statistics and produce a calibrated classification specification. The specification should enable consistent severity and salience classification of individual items relative to this corpus.`;

  const instructionsBlock = instructions
    ? `\n\n${asXML(instructions, { tag: 'classification-instructions' })}`
    : '';

  const thresholdBlock =
    thresholdStrategy !== 'statistical'
      ? `\n\nThreshold derivation strategy: ${thresholdStrategy}${
          thresholdStrategy === 'percentile'
            ? '\n- Use percentile-based boundaries (e.g., top 10% = critical, top 25% = high)\n- Calibrate severity thresholds relative to the score distribution\n- Salience should reflect how unusual an item is within its percentile band'
            : '\n- Use fixed severity boundaries independent of corpus distribution\n- Apply consistent thresholds regardless of how common or rare detections are\n- Salience should reflect absolute significance, not relative standing'
        }`
      : '';

  const sensitivityBlock =
    sensitivity === 'low'
      ? '\n\nClassification posture: conservative. Prefer false negatives over false positives. Only flag items with strong, unambiguous signals. Set severity and salience thresholds high — routine items should classify as none/routine unless clearly elevated.'
      : sensitivity === 'high'
        ? '\n\nClassification posture: sensitive. Prefer false positives over false negatives. Flag items with even weak or ambiguous signals. Set severity and salience thresholds low to catch edge cases — when in doubt, classify higher.'
        : '';

  const specUserPrompt = `Analyze these corpus scan statistics and generate a calibration specification.

${asXML(statistics, { tag: 'scan-statistics' })}${instructionsBlock}${thresholdBlock}${sensitivityBlock}

Provide a JSON object with exactly four string properties:
- corpusProfile: Overview of the corpus sensitivity landscape — what categories appear, how prevalent, overall risk profile
- classificationCriteria: How to assign severity (none/low/medium/high/critical) to individual items based on their scan hits
- salienceCriteria: How to determine salience (routine/notable/significant/exceptional) — what makes an item stand out relative to the corpus baseline
- categoryNotes: Per-category observations, calibration notes, and any special handling rules

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        ...config,
        systemPrompt: specSystemPrompt,
        response_format: {
          type: 'json_schema',
          json_schema: calibrateSpecificationJsonSchema,
        },
      }),
    {
      label: 'calibrate spec',
      config,
    }
  );

  return response;
}

/**
 * Apply a calibration specification to classify a single scan result (Pass 2).
 *
 * @param {object} scan - A single scan result from probeScan
 * @param {object} specification - Pre-generated calibration specification from calibrateSpec()
 * @param {object} [config]
 * @returns {Promise<{ severity: string, salience: string, categories: object, summary: string }>}
 */
export async function applyCalibrate(scan, specification, config = {}) {
  config = scopeOperation('calibrate:apply', config);

  const prompt = `Classify this scan result against the calibration specification.

${asXML(specification, { tag: 'calibration-specification' })}

${asXML(scan, { tag: 'scan-result' })}

Classify this item according to the specification.
Return a JSON object with:
- severity: one of "none", "low", "medium", "high", "critical"
- salience: one of "routine", "notable", "significant", "exceptional"
- categories: object mapping each detected category to { severity, salience }
- summary: brief explanation of the classification`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'calibrate_result',
            schema: calibrateResultSchema,
          },
        },
      }),
    {
      label: 'calibrate classify',
      config,
    }
  );

  return response;
}

/**
 * Create a reusable classifier with a baked-in specification.
 *
 * @param {object} specification - Pre-generated calibration specification
 * @param {object} [config]
 * @returns {Function} async (scan) => calibration result, with .specification property
 */
export function createCalibratedClassifier(specification, config = {}) {
  const classifierFunction = async function (scan) {
    return await applyCalibrate(scan, specification, config);
  };

  Object.defineProperty(classifierFunction, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  return classifierFunction;
}

// ===== Default Export =====

/**
 * Create a stateless calibrated classifier — each call builds a fresh spec from the single scan.
 *
 * @param {string} [instructions] - Domain-specific classification instructions
 * @param {object} [config]
 * @returns {Function} async (scan) => calibration result, with .instructions property
 */
export default function calibrate(instructions, config = {}) {
  const calibrateFunction = async function (scan) {
    const spec = await calibrateSpec([scan], { ...config, instructions });
    return await applyCalibrate(scan, spec, config);
  };

  Object.defineProperty(calibrateFunction, 'instructions', {
    get() {
      return instructions;
    },
    enumerable: true,
  });

  return calibrateFunction;
}
