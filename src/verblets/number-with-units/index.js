import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import toNumberWithUnits from '../../lib/to-number-with-units/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import numberWithUnitsSchema from './number-with-units-result.json' with { type: 'json' };

const { asNumberWithUnits, contentIsQuestion, explainAndSeparate, explainAndSeparateJSON } =
  promptConstants;

const name = 'number-with-units';

const responseFormat = jsonSchema('number_with_units_result', numberWithUnitsSchema);

/**
 * Extract numeric value and unit from text input
 * @param {string} text - The text to analyze
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.llm] - LLM configuration
 * @returns {Promise<Object>} Object with value and unit properties
 */
export default async function numberWithUnits(text, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const numberText = [
    `${contentIsQuestion} ${asXML(inputText, { tag: 'text' })} \n\n${explainAndSeparate} ${explainAndSeparateJSON}

Answer the question and provide the numeric value and unit. If the question is unanswerable or the specific numeric value cannot be determined, set "value" to "unanswerable" but still identify the unit being asked for.

${asNumberWithUnits}`,
    context,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const response = await callLlm(numberText, {
      ...runConfig,
      responseFormat,
    });

    // With structured output, response is already parsed
    const result = toNumberWithUnits(JSON.stringify(response));

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

numberWithUnits.knownTexts = [];
