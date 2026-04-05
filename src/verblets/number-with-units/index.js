import callLlm from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import numberWithUnitsSchema from './number-with-units-result.json' with { type: 'json' };

const { asNumberWithUnits, contentIsQuestion, explainAndSeparate, explainAndSeparateJSON } =
  promptConstants;

const name = 'number-with-units';

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
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const numberText = `${contentIsQuestion} ${text} \n\n${explainAndSeparate} ${explainAndSeparateJSON}

Answer the question and provide the numeric value and unit. If the question is unanswerable or the specific numeric value cannot be determined, set "value" to null but still identify the unit being asked for.

${asNumberWithUnits}`;

  try {
    const response = await callLlm(numberText, {
      ...runConfig,
      response_format: responseFormat,
    });

    // With structured output, response is already parsed
    const result = toNumberWithUnits(JSON.stringify(response));

    emitter.complete({ outcome: 'success' });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
