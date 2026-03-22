import {
  CATEGORY_SEVERITY,
  SEVERITY_ORDER,
  severityAtLeast,
} from '../../constants/sensitivity-categories.js';

// policyFromAudit constants
const THRESHOLD_BY_LEVEL = { critical: 0.3, high: 0.35, medium: 0.4, low: 0.45, none: 0.45 };
const METHOD_BY_LEVEL = {
  critical: 'strict',
  high: 'strict',
  medium: 'balanced',
  low: 'light',
  none: 'light',
};
const REDACT_CATEGORIES = new Set([
  'pii-government-id',
  'credential-password',
  'credential-key',
  'financial-card',
  'financial-account',
]);
const HIGH_FLAGGED_RATIO = 0.25;

const highestSeverity = (categories) => {
  let max = -1;
  let level = 'none';
  for (const { severity } of Object.values(categories)) {
    const rank = SEVERITY_ORDER[severity] ?? 0;
    if (rank > max) {
      max = rank;
      level = severity;
    }
  }
  return level;
};

const buildSummary = (level, categories) => {
  if (level === 'none') return 'No sensitive content detected.';

  const sorted = Object.entries(categories).toSorted(([, a], [, b]) => {
    const sevDiff = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
    return sevDiff !== 0 ? sevDiff : b.maxScore - a.maxScore;
  });

  const names = sorted.map(([cat]) => cat).join(', ');
  return `${level} risk: ${sorted.length} ${sorted.length === 1 ? 'category' : 'categories'} detected (${names})`;
};

/**
 * Classify a sensitivity scan result into a risk level.
 *
 * Pure function — no I/O, no LLM calls. Takes the output of sensitivityScan
 * and returns a structured risk assessment.
 *
 * @param {{ flagged: boolean, hits: Array<{ category: string, score: number }> }} scan
 * @returns {{ level: string, maxScore: number, categories: object, summary: string }}
 */
export default function sensitivityClassify(scan) {
  if (!scan.flagged) {
    return {
      level: 'none',
      maxScore: 0,
      categories: {},
      summary: 'No sensitive content detected.',
    };
  }

  const categories = {};
  let maxScore = 0;

  for (const hit of scan.hits) {
    const { category, score } = hit;
    const severity = CATEGORY_SEVERITY[category] ?? 'low';

    if (!categories[category]) {
      categories[category] = { count: 0, maxScore: 0, severity };
    }
    categories[category].count += 1;
    categories[category].maxScore = Math.max(categories[category].maxScore, score);
    maxScore = Math.max(maxScore, score);
  }

  const level = highestSeverity(categories);
  const summary = buildSummary(level, categories);

  return { level, maxScore, categories, summary };
}

const classificationToSummary = (classification) => {
  const { level = 'none', categories = {} } = classification ?? {};
  return {
    totalItems: 1,
    flaggedCount: level !== 'none' ? 1 : 0,
    maxLevel: level,
    categoryCounts: Object.fromEntries(Object.keys(categories).map((k) => [k, 1])),
    levelCounts: { [level]: 1 },
  };
};

/**
 * Derive a guard policy from a sensitivityClassify or sensitivityCheck result.
 *
 * Pure function — no I/O, no LLM calls. Converts the classification to an
 * audit summary shape, then delegates to policyFromAudit.
 *
 * @param {object} classification - Output from sensitivityClassify or sensitivityCheck
 * @returns {{ threshold: number, categories: string[], protection: string, mode: string, method: string, verify: boolean }}
 */
export function policyFromClassification(classification) {
  const summary = classificationToSummary(classification);
  return policyFromAudit(summary);
}

/**
 * Derive a guard policy from an aggregateAudit summary.
 *
 * Pure function — no I/O, no LLM calls. Produces a deterministic guard
 * configuration based on severity levels and category composition.
 *
 * @param {object} summary - Output from aggregateAudit ({ totalItems, flaggedCount, maxLevel, categoryCounts, levelCounts })
 * @returns {{ threshold: number, categories: string[], protection: string, mode: string, method: string, verify: boolean }}
 */
export function policyFromAudit(summary) {
  const {
    totalItems = 0,
    flaggedCount = 0,
    maxLevel = 'none',
    categoryCounts = {},
  } = summary ?? {};

  const categories = Object.keys(categoryCounts);
  const threshold = THRESHOLD_BY_LEVEL[maxLevel] ?? THRESHOLD_BY_LEVEL.none;
  const method = METHOD_BY_LEVEL[maxLevel] ?? METHOD_BY_LEVEL.none;
  const hasRedactCategory = categories.some((c) => REDACT_CATEGORIES.has(c));
  const protection =
    hasRedactCategory && severityAtLeast(maxLevel, 'high') ? 'redact' : 'depersonalize';
  const flaggedRatio = totalItems > 0 ? flaggedCount / totalItems : 0;
  const verify = flaggedRatio > HIGH_FLAGGED_RATIO || severityAtLeast(maxLevel, 'high');

  return { threshold, categories, protection, mode: 'placeholder', method, verify };
}
