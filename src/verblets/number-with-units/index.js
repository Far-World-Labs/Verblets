import chatGPT from '../../lib/chatgpt/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import numberWithUnitsSchema from './number-with-units-result.json';

const { asNumberWithUnits, contentIsQuestion, explainAndSeparate, explainAndSeparateJSON } =
  promptConstants;

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(llm = 'fastGoodCheap') {
  const schema = numberWithUnitsSchema;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'number_with_units_result',
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

Extract the numeric value and unit from the question. If you cannot determine the specific numeric value, set "value" to null but still identify the unit being asked for.

${asNumberWithUnits}`;

  const modelOptions = createModelOptions(llm);
  const response = await chatGPT(numberText, {
    modelOptions,
    ...options,
  });

  // With structured output, response is already parsed
  return toNumberWithUnits(JSON.stringify(response));
}
