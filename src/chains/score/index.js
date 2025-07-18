import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { scaleSpec } from '../../verblets/scale/index.js';
import map from '../map/index.js';

const { onlyJSON } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for score results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getScoreSchema() {
  const schemaPath = path.join(__dirname, 'score-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getScoreSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'score_result',
      schema,
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

  const modelOptions = await createModelOptions();
  const response = await chatGPT(prompt, {
    modelOptions,
    llm,
    ...options,
  });

  const parsed = typeof response === 'string' ? JSON.parse(response) : response;
  return parsed.score;
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
 * Create map instructions for scoring
 * @param {string} scoreInstructions - Base scoring instructions
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function mapInstructions(scoreInstructions, config = {}, createSpec = scoreSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoreInstructions, specConfig);

  const instructions = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}

Return ONLY the score value from the range for each item, nothing else.`;

  return createInstructionResult(instructions, specification, returnTuple);
}

/**
 * Create filter instructions for scoring
 * @param {string} scoreInstructions - Base scoring instructions
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function filterInstructions(scoreInstructions, config = {}, createSpec = scoreSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoreInstructions, specConfig);

  const instructions = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}`;

  return createInstructionResult(instructions, specification, returnTuple);
}

/**
 * Create reduce instructions for scoring
 * @param {string} scoreInstructions - Base scoring instructions
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function reduceInstructions(scoreInstructions, config = {}, createSpec = scoreSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoreInstructions, specConfig);

  const instructions = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}`;

  return createInstructionResult(instructions, specification, returnTuple);
}

/**
 * Create find instructions for scoring
 * @param {string} scoreInstructions - Base scoring instructions
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function findInstructions(scoreInstructions, config = {}, createSpec = scoreSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoreInstructions, specConfig);

  const instructions = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}`;

  return createInstructionResult(instructions, specification, returnTuple);
}

/**
 * Create group instructions for scoring
 * @param {string} scoreInstructions - Base scoring instructions
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to scoreSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function groupInstructions(scoreInstructions, config = {}, createSpec = scoreSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(scoreInstructions, specConfig);

  const instructions = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}

Group items based on their score ranges from the specification.`;

  return createInstructionResult(instructions, specification, returnTuple);
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
