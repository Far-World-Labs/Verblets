import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { scaleSpec } from '../scale/index.js';
import map from '../map/index.js';
import scoreSchema from './score-result.json';

const { onlyJSON } = promptConstants;

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(llm = 'fastGoodCheap') {
  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'score_result',
      schema: scoreSchema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else {
    return {
      ...llm,
      response_format: responseFormat,
    };
  }
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
 * @returns {Promise<*>} Score value (type depends on specification range)
 */
export async function applyScore(item, specification, config = {}) {
  const { llm, ...options } = config;

  const prompt = `Apply the score specification to evaluate this item.

${asXML(specification, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with a "score" property containing the value from the range.

${onlyJSON}

${asXML(item, { tag: 'item' })}`;

  const modelOptions = createModelOptions();
  const response = await chatGPT(prompt, {
    modelOptions,
    llm,
    ...options,
  });

  return response.score;
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
  const mapInstr = await mapInstructions(instructions, config);
  const scores = await map(list, mapInstr, config);
  return scores.map((s) => Number(s));
}

// ===== Instruction Builders =====

/**
 * Helper to create instruction with attached specification
 * @param {string} instructions - The instruction string
 * @param {Object} specification - The specification object
 * @param {boolean} returnTuple - Whether to return as tuple
 * @returns {string|Object} Instructions with specification attached or tuple
 */
function createInstructionResult(instructions, specification, returnTuple) {
  if (returnTuple) {
    return { value: instructions, specification };
  }
  // Attach specification as a property to the string
  return Object.assign(instructions, { specification });
}

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
 * @param {string|Object} instructions - Scoring criteria string or instructions object
 * @param {string} instructions.scoring - How to score each item (e.g., "technical quality", "humor level")
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function mapInstructions(instructions, config = {}, createSpec = scoreSpec) {
  // Handle backward compatibility - if instructions is a string, use it as scoring
  const scoring = typeof instructions === 'string' ? instructions : instructions.scoring;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoring, specConfig);

  const combinedInstructions = buildScoringInstructions(
    specification,
    'Return ONLY the score value from the range for each item, nothing else.'
  );

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create filter instructions for scoring
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scoring - How to score each item (e.g., "production readiness", "technical debt")
 * @param {string} instructions.processing - Which items to keep (e.g., "scores above 7", "only perfect scores")
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function filterInstructions(instructions, config = {}, createSpec = scoreSpec) {
  const { scoring, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoring, specConfig);

  const filterContext = `<filter-condition>
${processing}
</filter-condition>`;

  const combinedInstructions = `${buildScoringInstructions(specification)}\n\n${filterContext}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create reduce instructions for scoring
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scoring - How to score each item (e.g., "performance impact", "code quality")
 * @param {string} instructions.processing - How to reduce the scores (e.g., "sum all scores", "find highest score with its item")
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function reduceInstructions(instructions, config = {}, createSpec = scoreSpec) {
  const { scoring, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoring, specConfig);

  const reduceContext = `<reduce-operation>
${processing}

Process each item by:
1. Applying the score specification to get a numeric score
2. Using that score in the reduction operation
3. Accumulating results across all items
4. Returning the final reduced value
</reduce-operation>`;

  const combinedInstructions = `${buildScoringInstructions(specification)}\n\n${reduceContext}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create find instructions for scoring
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scoring - How to score each item (e.g., "user intent alignment", "relevance")
 * @param {string} instructions.processing - Which item to select (e.g., "highest scoring", "first above threshold 8")
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function findInstructions(instructions, config = {}, createSpec = scoreSpec) {
  const { scoring, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoring, specConfig);

  const findContext = `<selection-criteria>
${processing}
</selection-criteria>`;

  const combinedInstructions = `${buildScoringInstructions(specification)}\n\n${findContext}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create group instructions for scoring
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.scoring - How to score each item (e.g., "complexity level", "difficulty")
 * @param {string} instructions.processing - How to group by scores (e.g., "low (0-3), medium (4-7), high (8-10)")
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function groupInstructions(instructions, config = {}, createSpec = scoreSpec) {
  const { scoring, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoring, specConfig);

  const groupContext = `<grouping-strategy>
${processing}
</grouping-strategy>`;

  const combinedInstructions = `${buildScoringInstructions(specification)}\n\n${groupContext}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
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
