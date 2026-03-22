import callLlm from '../../lib/llm/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import numberWithUnitsSchema from './number-with-units-result.json';

const { asNumberWithUnits, contentIsQuestion, explainAndSeparate, explainAndSeparateJSON } =
  promptConstants;

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'number_with_units_result',
    schema: numberWithUnitsSchema,
  },
};

/**
 * Extract numeric value and unit from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<Object>} Object with value and unit properties
 */
export default async function numberWithUnits(text, config = {}) {
  const { llm, ...options } = config;
  const numberText = `${contentIsQuestion} ${text} \n\n${explainAndSeparate} ${explainAndSeparateJSON}

Answer the question and provide the numeric value and unit. If the question is unanswerable or the specific numeric value cannot be determined, set "value" to null but still identify the unit being asked for.

${asNumberWithUnits}`;

  const response = await callLlm(numberText, {
    llm,
    modelOptions: { response_format: responseFormat },
    ...options,
  });

  // With structured output, response is already parsed
  return toNumberWithUnits(JSON.stringify(response));
}
