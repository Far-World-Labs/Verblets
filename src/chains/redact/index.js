import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import buildInstructions from '../../lib/build-instructions/index.js';
import { PLACEHOLDER_PREFIXES, GENERALIZATIONS } from '../../constants/sensitivity-categories.js';
import { debug } from '../../lib/debug/index.js';
import { resolveOption } from '../../lib/context/resolve.js';
import redactionResultSchema from './redaction-result.json';
import redactionSpecSchema from './redaction-specification.json';

const SENSITIVE_LLM = { sensitive: true, good: true };

export const redactMode = {
  PLACEHOLDER: 'placeholder',
  GENERALIZE: 'generalize',
};

const MODES = Object.values(redactMode);

const modeDescription = (mode) =>
  mode === redactMode.PLACEHOLDER
    ? `Replace each PII instance with a category-specific placeholder like [PERSON_1], [EMAIL_1], [GOV_ID_1]. Increment the counter for each new distinct value within a category.`
    : `Replace each PII instance with a natural-language generalization like "a person", "an email address", "a government identifier".`;

const categoryHints = (categories) => {
  if (!categories || categories.length === 0) return '';
  const labels = categories
    .map((cat) => {
      const prefix = PLACEHOLDER_PREFIXES[cat];
      const gen = GENERALIZATIONS[cat];
      return prefix ? `${cat} (placeholder: [${prefix}_N], generalization: ${gen})` : cat;
    })
    .join('\n  - ');
  return `\nFocus on these sensitivity categories:\n  - ${labels}\n`;
};

const guidedPrompt = (text, scan, mode, categories) => {
  const flaggedRegions = scan.hits
    .map((h) => `- "${h.chunk.text}" (${h.category}, score: ${h.score.toFixed(2)})`)
    .join('\n');

  return `Redact the sensitive content in this text.

${asXML(text, { tag: 'text' })}

The following regions have been flagged by a sensitivity scan:
${flaggedRegions}

Redaction mode: ${mode}
${modeDescription(mode)}
${categoryHints(categories)}
Replace each flagged item. If you find additional PII not in the scan results, redact that too.
Return a JSON object with "text" (the redacted text) and "replacements" (array of {category, original, replacement}).`;
};

const unguidedPrompt = (text, mode, categories) =>
  `Identify and redact all sensitive content (PII) in this text.

${asXML(text, { tag: 'text' })}

Redaction mode: ${mode}
${modeDescription(mode)}
${categoryHints(categories)}
Scan the text for any personally identifiable information, credentials, medical data, financial data, or other sensitive content.
Return a JSON object with "text" (the redacted text) and "replacements" (array of {category, original, replacement}).`;

const specBlock = (specification) =>
  specification ? `\n${asXML(specification, { tag: 'redaction-rules' })}\n` : '';

// ===== Instruction Builders =====

export const {
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = buildInstructions({
  specTag: 'redaction-specification',
  defaults: {
    map: `Apply redaction to each text item and return the redacted version.`,
    filter: `Keep items that contain sensitive or personally identifiable information above a moderate threshold.\n\nNote: This evaluates the original text's sensitivity level, then returns redacted versions of filtered items.`,
    find: `Select the item with the highest concentration of sensitive content.\n\nNote: This evaluates the original texts, then returns the redacted version of the selected item.`,
    group: `Group items by sensitivity level (low/medium/high) based on the types of PII they contain.`,
  },
  steps: {
    reduce: `Apply the reduce operation to combine text items, then redact the final accumulated result.`,
    filter: `Evaluate each item's sensitivity level to determine which meet the filter criteria.`,
    find: `Analyze items to identify the one that best matches the selection criteria.`,
    group: `Analyze each item to determine its appropriate group based on redaction needs.`,
  },
  specIntro: {
    map: 'Apply this redaction specification to each item:',
    filter: 'For items that pass the filter, apply this redaction:',
    reduce: 'Apply this redaction to the final accumulated result:',
    find: 'Apply this redaction to the selected item:',
    group: 'Apply this redaction to items within each group:',
  },
  mapSuffix: {
    processing: 'Return the redacted text with any relevant metadata.',
    default: 'Return the redacted text.',
  },
});

// ===== Core Functions =====

/**
 * Redact PII from text.
 *
 * Two prompt paths:
 * - **Guided** (scan provided): prompt includes flagged regions for precision
 * - **Unguided** (no scan): LLM finds PII itself using category labels
 *
 * @param {string} text - Text to redact
 * @param {object} [options]
 * @param {object} [options.scan] - Result from sensitivityScan — enables guided mode
 * @param {string} [options.mode='placeholder'] - 'placeholder' or 'generalize'
 * @param {string[]} [options.categories] - Filter which PII categories to target
 * @param {string|object} [options.llm={ sensitive: true, good: true }] - LLM config (defaults to sensitive+good privacy model; override to control model routing)
 * @param {number} [options.maxAttempts=3] - Max retry attempts
 * @param {function} [options.onProgress] - Progress callback
 * @param {AbortSignal} [options.abortSignal] - Abort signal
 * @returns {Promise<{ text: string, replacements: Array<{ category: string, original: string, replacement: string }>, scan?: object }>}
 */
export default async function redact(text, options = {}) {
  const {
    scan,
    mode: _mode,
    categories,
    llm = SENSITIVE_LLM,
    maxAttempts = 3,
    onProgress,
    abortSignal,
    ...rest
  } = options;
  const mode = resolveOption('mode', options, redactMode.PLACEHOLDER);

  if (llm === SENSITIVE_LLM) {
    debug(
      'redact: using default llm { sensitive: true, good: true } — pass options.llm to override'
    );
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  if (!MODES.includes(mode)) {
    throw new Error(`Mode must be one of: ${MODES.join(', ')}`);
  }

  // Short-circuit: scan provided and nothing flagged
  if (scan && !scan.flagged) {
    return { text, replacements: [], scan };
  }

  const prompt = scan
    ? guidedPrompt(text, scan, mode, categories)
    : unguidedPrompt(text, mode, categories);

  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        modelOptions: {
          systemPrompt:
            'You are a PII redaction engine. Identify and replace sensitive information precisely.',
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'redaction_result',
              schema: redactionResultSchema,
            },
          },
        },
        ...rest,
      }),
    {
      label: 'redact',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

  const result = { text: response.text, replacements: response.replacements };
  if (scan) result.scan = scan;
  return result;
}

/**
 * Generate a redaction specification from instructions.
 *
 * Returns structured JSON via response_format — not free text.
 *
 * @param {string} instructions - Natural language redaction instructions
 * @param {object} [config]
 * @returns {Promise<{ mode: string, targetCategories: string[], replacementRules: string, edgeCases: string, contextNotes: string }>}
 */
export async function redactSpec(instructions, config = {}) {
  const { llm = SENSITIVE_LLM, maxAttempts = 3, onProgress, abortSignal, ...rest } = config;

  if (llm === SENSITIVE_LLM) {
    debug(
      'redactSpec: using default llm { sensitive: true, good: true } — pass config.llm to override'
    );
  }

  const specSystemPrompt = `You are a redaction specification generator. Create a clear, structured specification for redacting sensitive information from text.`;

  const specUserPrompt = `Analyze these redaction instructions and generate a specification.

${asXML(instructions, { tag: 'redaction-instructions' })}

Provide a JSON object describing:
- mode: The redaction mode (placeholder or generalize)
- targetCategories: Array of sensitivity categories to target (e.g. pii-name, contact-email, gov-id)
- replacementRules: Rules for how to replace sensitive content
- edgeCases: How to handle ambiguous or edge-case PII
- contextNotes: Any special handling requirements or context-specific notes`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        llm,
        modelOptions: {
          systemPrompt: specSystemPrompt,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'redaction_specification',
              schema: redactionSpecSchema,
            },
          },
        },
        ...rest,
      }),
    {
      label: 'redact spec',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

  return response;
}

/**
 * Apply a redaction specification to text.
 *
 * The specification is injected as XML into the prompt,
 * genuinely influencing the redaction behavior.
 *
 * @param {string} text - Text to redact
 * @param {object} specification - Structured redaction specification
 * @param {object} [config]
 * @param {object} [config.scan] - Result from sensitivityScan — enables guided mode
 * @returns {Promise<{ text: string, replacements: Array, scan?: object }>}
 */
export async function applyRedact(text, specification, config = {}) {
  const { scan, llm = SENSITIVE_LLM, maxAttempts = 3, onProgress, abortSignal, ...rest } = config;

  if (llm === SENSITIVE_LLM) {
    debug(
      'applyRedact: using default llm { sensitive: true, good: true } — pass config.llm to override'
    );
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  // Short-circuit: scan provided and nothing flagged
  if (scan && !scan.flagged) {
    return { text, replacements: [], scan };
  }

  const mode = specification.mode || redactMode.PLACEHOLDER;
  const categories = specification.targetCategories;

  const basePrompt = scan
    ? guidedPrompt(text, scan, mode, categories)
    : unguidedPrompt(text, mode, categories);

  const prompt = `${basePrompt}
${specBlock(specification)}`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        modelOptions: {
          systemPrompt:
            'You are a PII redaction engine. Identify and replace sensitive information precisely.',
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'redaction_result',
              schema: redactionResultSchema,
            },
          },
        },
        ...rest,
      }),
    {
      label: 'redact apply',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

  const result = { text: response.text, replacements: response.replacements };
  if (scan) result.scan = scan;
  return result;
}

/**
 * Create a redactor function with a baked-in specification.
 *
 * @param {object} specification - Structured redaction specification
 * @param {object} [config] - Default config for each call
 * @returns {Function} async (text) => result, with .specification property
 */
export function createRedactor(specification, config = {}) {
  const redactorFn = (text) => applyRedact(text, specification, config);

  Object.defineProperty(redactorFn, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  return redactorFn;
}
