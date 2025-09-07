import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { scaleSpec } from '../scale/index.js';
import map from '../map/index.js';
import scoreSingleResultSchema from './score-single-result.json';

const { onlyJSON } = promptConstants;

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
  const { llm, maxAttempts = 3, ...options } = config;

  const prompt = `Apply the score specification to evaluate this item.

${asXML(specification, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with a "value" property containing the score from the range.

${onlyJSON}

${asXML(item, { tag: 'item' })}`;

  const response = await retry(chatGPT, {
    label: 'score item',
    maxRetries: maxAttempts,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'score_single_result',
            schema: scoreSingleResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
    logger: options.logger,
  });

  // chatGPT auto-unwraps single value property, returns the number directly
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
  const spec = await scoreSpec(instructions, config);
  return await applyScore(item, spec, config);
}

/**
 * Score a list of items
 * @param {Array} list - Array of items
 * @param {string} instructions - Scoring instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of scores
 */
export async function mapScore(list, instructions, config = {}) {
  const spec = await scoreSpec(instructions, config);
  const mapInstr = mapInstructions({ specification: spec });
  const scores = await map(list, mapInstr, config);
  return scores.map((s) => Number(s));
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

// ===== Calibration Utilities =====

/**
 * Build calibration reference from scored items
 * Selects representative items from low, middle, and high score ranges
 * @param {Array<{item: *, score: number}>} scoredItems - Items with their scores
 * @param {number} count - Number of examples per range (default 3)
 * @returns {Array<{item: *, score: number}>} Calibration reference examples
 */
export function buildCalibrationReference(scoredItems, count = 3) {
  const valid = scoredItems.filter((s) => Number.isFinite(s.score));
  if (!valid.length) return [];

  valid.sort((a, b) => a.score - b.score);

  const lows = valid.slice(0, count);
  const highs = valid.slice(-count);
  const midStart = Math.max(0, Math.floor(valid.length / 2) - Math.floor(count / 2));
  const mids = valid.slice(midStart, midStart + count);

  return [...lows, ...mids, ...highs];
}

/**
 * Format calibration examples as XML block
 * @param {Array<{item: *, score: number}>} calibration - Calibration examples
 * @returns {string} Formatted calibration block
 */
export function formatCalibrationBlock(calibration) {
  if (!calibration || !calibration.length) return '';

  return `\nCalibration examples:\n${asXML(
    calibration.map((c) => `${c.score} - ${c.item}`).join('\n'),
    { tag: 'calibration' }
  )}`;
}

// Default export: Score a list of items
export default mapScore;
