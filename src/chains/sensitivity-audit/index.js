import sensitivityScan from '../sensitivity-scan/index.js';
import sensitivityClassify from '../../lib/sensitivity-classify/index.js';
import { parallelBatch } from '../../lib/parallel-batch/index.js';
import {
  emitBatchStart,
  emitBatchProcessed,
  emitBatchComplete,
} from '../../lib/progress-callback/index.js';
import { SEVERITY_ORDER } from '../../constants/sensitivity-categories.js';
import { resolveOption } from '../../lib/context/resolve.js';

/**
 * Aggregate individual audit items into a summary.
 *
 * Pure function — takes the per-item results and produces counts and max severity.
 *
 * @param {Array<{ scan: object, classification: object }>} items - Audited items
 * @returns {{ totalItems: number, flaggedCount: number, maxLevel: string, categoryCounts: object, levelCounts: object }}
 */
export function aggregateAudit(items) {
  const categoryCounts = {};
  const levelCounts = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };
  let maxLevel = 'none';
  let flaggedCount = 0;

  for (const item of items) {
    const { classification } = item;
    const level = classification.level;

    levelCounts[level] = (levelCounts[level] ?? 0) + 1;

    if (level !== 'none') flaggedCount++;

    if ((SEVERITY_ORDER[level] ?? 0) > (SEVERITY_ORDER[maxLevel] ?? 0)) {
      maxLevel = level;
    }

    for (const category of Object.keys(classification.categories)) {
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }
  }

  return {
    totalItems: items.length,
    flaggedCount,
    maxLevel,
    categoryCounts,
    levelCounts,
  };
}

/**
 * Batch sensitivity audit — scan, classify, and aggregate multiple texts.
 *
 * No LLM calls — uses embedding-based sensitivity scan + pure classification.
 *
 * @param {string[]} texts - Texts to audit
 * @param {object} [options]
 * @param {number} [options.threshold] - Min cosine similarity to flag
 * @param {string[]} [options.categories] - Only scan for these categories
 * @param {number} [options.maxTokens] - Chunk size for long texts
 * @param {number} [options.maxParallel=5] - Max concurrent scans
 * @param {function} [options.onProgress] - Progress callback
 * @returns {Promise<{ items: Array<{ text: string, scan: object, classification: object }>, summary: object }>}
 */
export default async function sensitivityAudit(texts, options = {}) {
  const { maxParallel = 5, onProgress } = options;
  const threshold = resolveOption('threshold', options, undefined);
  const categories = resolveOption('categories', options, undefined);
  const maxTokens = resolveOption('maxTokens', options, undefined);

  if (!texts || texts.length === 0) {
    return {
      items: [],
      summary: aggregateAudit([]),
    };
  }

  const totalItems = texts.length;
  emitBatchStart(onProgress, 'sensitivityAudit', totalItems);

  let processedItems = 0;

  const scanOptions = {};
  if (threshold !== undefined) scanOptions.threshold = threshold;
  if (categories !== undefined) scanOptions.categories = categories;
  if (maxTokens !== undefined) scanOptions.maxTokens = maxTokens;

  const items = await parallelBatch(
    texts,
    async (text) => {
      const scan = await sensitivityScan(text, scanOptions);
      const classification = sensitivityClassify(scan);

      processedItems++;
      emitBatchProcessed(onProgress, 'sensitivityAudit', {
        totalItems,
        processedItems,
        batchNumber: processedItems,
        batchSize: 1,
      });

      return { text, scan, classification };
    },
    { maxParallel }
  );

  const summary = aggregateAudit(items);

  emitBatchComplete(onProgress, 'sensitivityAudit', totalItems);

  return { items, summary };
}

/**
 * Create a pre-configured sensitivity auditor function.
 *
 * @param {object} [options] - Default audit options (threshold, categories, maxTokens, maxParallel, onProgress)
 * @returns {Function} auditFn(texts) → Promise<object> with `.options` property
 */
export function createSensitivityAuditor(options = {}) {
  const auditFn = (texts) => sensitivityAudit(texts, options);
  Object.defineProperty(auditFn, 'options', {
    get() {
      return options;
    },
    enumerable: true,
  });
  return auditFn;
}
