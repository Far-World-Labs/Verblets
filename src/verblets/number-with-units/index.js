import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asNumberWithUnits, contentIsQuestion, explainAndSeparate, explainAndSeparateJSON } =
  promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for number with units results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getNumberWithUnitsSchema() {
  const schemaPath = path.join(__dirname, 'number-with-units-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getNumberWithUnitsSchema();

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

export default async (text, config = {}) => {
  const { llm, ...options } = config;
  const numberText = `${contentIsQuestion} ${text} \n\n${explainAndSeparate} ${explainAndSeparateJSON}

Extract the numeric value and unit from the question. If you cannot determine the specific numeric value, set "value" to null but still identify the unit being asked for.

${asNumberWithUnits}`;

  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(numberText, { modelOptions, ...options });

  // With structured outputs, response should already be parsed, but we still use
  // toNumberWithUnits for additional validation and processing
  let rawResult;
  if (typeof response === 'string') {
    // Handle the case where response might be "undefined" or other non-JSON strings
    if (response.trim() === 'undefined') {
      rawResult = { value: undefined, unit: undefined };
    } else {
      try {
        rawResult = JSON.parse(response);
      } catch {
        // If parsing fails, create a default structure
        rawResult = { value: undefined, unit: undefined };
      }
    }
  } else {
    rawResult = response;
  }

  return toNumberWithUnits(JSON.stringify(rawResult));
};
