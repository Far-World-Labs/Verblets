import sensitivityScan from '../sensitivity-scan/index.js';
import depersonalize, { applyDepersonalize } from '../depersonalize/index.js';
import redact, { applyRedact } from '../redact/index.js';
import sensitivityClassify from '../../lib/sensitivity-classify/index.js';
import buildInstructions from '../../lib/build-instructions/index.js';
import { resolveOption } from '../../lib/context/resolve.js';

// ===== Instruction Builders =====

export const {
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = buildInstructions({
  specTag: 'guard-specification',
  defaults: {
    map: `Apply sensitivity guard to each text item. Detect and protect any sensitive content according to the guard specification.`,
    filter: `Keep items that contain sensitive or personally identifiable information.\n\nNote: This evaluates the original text's sensitivity, then returns guarded versions of filtered items.`,
    find: `Select the item with the highest concentration of sensitive content.\n\nNote: This evaluates the original texts, then returns the guarded version of the selected item.`,
    group: `Group items by sensitivity level (none/low/medium/high/critical) based on the types of sensitive content they contain.`,
  },
  steps: {
    reduce: `Apply the reduce operation to combine text items, then guard the final accumulated result.`,
    filter: `Evaluate each item's sensitivity level to determine which meet the filter criteria.`,
    find: `Analyze items to identify the one that best matches the selection criteria.`,
    group: `Analyze each item to determine its appropriate group based on sensitivity level.`,
  },
  specIntro: {
    map: 'Apply this sensitivity guard specification to each item:',
    filter: 'For items that pass the filter, apply this guard:',
    reduce: 'Apply this guard to the final accumulated result:',
    find: 'Apply this guard to the selected item:',
    group: 'Apply this guard to items within each group:',
  },
  mapSuffix: {
    processing: 'Return the protected text with any relevant metadata.',
    default: 'Return the protected text.',
  },
});

// ===== Constants =====

export const protectionStrategy = {
  REDACT: 'redact',
  DEPERSONALIZE: 'depersonalize',
};

/**
 * Create a pre-configured sensitivity guard function.
 *
 * @param {object} [options] - Policy preset or guard options (threshold, categories, method, etc.)
 * @returns {Function} guardFn(text) → Promise<object> with `.options` property
 */
export function createSensitivityGuard(options = {}) {
  const guardFn = (text) => sensitivityGuard(text, options);
  Object.defineProperty(guardFn, 'options', {
    get() {
      return options;
    },
    enumerable: true,
  });
  return guardFn;
}

/**
 * Detect sensitive content and protect if flagged.
 *
 * Composes sensitivityScan → sensitivityClassify → protection strategy.
 * `result.text` is always the safe-to-use output — original if clean, protected if flagged.
 *
 * Options are flat to enable spreading policy presets:
 *   sensitivityGuard(text, sensitivityPolicy.HIPAA)
 *
 * @param {string} text - Text to guard
 * @param {object} [options]
 *
 * Detection:
 * @param {number} [options.threshold=0.4] - Min cosine similarity to flag
 * @param {string[]} [options.categories] - Only scan for these category strings
 * @param {number} [options.maxTokens=256] - Chunk size for long texts
 * @param {object} [options.scan] - Pre-computed scan result (skips detection)
 *
 * Protection:
 * @param {string|Function} [options.protection='depersonalize'] - Strategy name or custom async function
 * @param {string} [options.method='balanced'] - Depersonalization method (strict/balanced/light)
 * @param {string} [options.context] - Depersonalization context
 * @param {string} [options.mode='placeholder'] - Redact mode (placeholder/generalize)
 * @param {object} [options.specification] - Spec for applyRedact or applyDepersonalize
 *
 * Verification:
 * @param {boolean} [options.verify=false] - Rescan protected text to confirm sensitivity removal
 *
 * Runtime:
 * @param {string|object} [options.llm] - LLM config
 * @param {number} [options.maxAttempts] - Max retry attempts
 * @param {function} [options.onProgress] - Progress callback
 *
 * @returns {Promise<{ flagged: boolean, text: string, scan: object, classification: object, protection: object|undefined, verification: object|undefined }>}
 */
export default async function sensitivityGuard(text, options = {}) {
  const { scan: providedScan, context, specification, llm, maxAttempts, onProgress } = options;
  const categories = resolveOption('categories', options, undefined);
  const threshold = resolveOption('threshold', options, 0.4);
  const maxTokens = resolveOption('maxTokens', options, 256);
  const protection = resolveOption('protection', options, 'depersonalize');
  const method = resolveOption('method', options, 'balanced');
  const mode = resolveOption('mode', options, 'placeholder');
  const verify = resolveOption('verify', options, false);
  const scan = providedScan ?? (await sensitivityScan(text, { threshold, categories, maxTokens }));
  const classification = sensitivityClassify(scan);

  if (!scan.flagged) {
    return {
      flagged: false,
      text,
      scan,
      classification,
      protection: undefined,
      verification: undefined,
    };
  }

  const strategyName =
    typeof protection === 'function'
      ? 'custom'
      : protection === 'redact'
        ? 'redact'
        : 'depersonalize';
  const strategyResult =
    typeof protection === 'function'
      ? await protection(text, { scan, llm, maxAttempts, onProgress })
      : protection === 'redact'
        ? await applyProtectionRedact(text, {
            scan,
            mode,
            specification,
            llm,
            maxAttempts,
            onProgress,
          })
        : await applyProtectionDepersonalize(text, {
            method,
            context,
            specification,
            llm,
            maxAttempts,
            onProgress,
          });

  const verification = verify
    ? await sensitivityScan(strategyResult.text, { threshold, categories, maxTokens }).then(
        (verificationScan) => ({ flagged: verificationScan.flagged, scan: verificationScan })
      )
    : undefined;

  return {
    flagged: true,
    text: strategyResult.text,
    scan,
    classification,
    protection: { strategy: strategyName, ...strategyResult },
    verification,
  };
}

function applyProtectionRedact(text, { scan, mode, specification, llm, maxAttempts, onProgress }) {
  if (specification) {
    return applyRedact(text, specification, { scan, llm, maxAttempts, onProgress });
  }
  return redact(text, { scan, mode, llm, maxAttempts, onProgress });
}

function applyProtectionDepersonalize(
  text,
  { method, context, specification, llm, maxAttempts, onProgress }
) {
  if (specification) {
    return applyDepersonalize(text, specification, { llm, maxAttempts, onProgress });
  }
  return depersonalize(text, { method, context, llm, maxAttempts, onProgress });
}
