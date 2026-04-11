import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asXML } from '../../prompts/index.js';
import { intent as intentSchema } from '../../json-schemas/index.js';

const name = 'intent';

// ===== Option Mappers =====

/**
 * Map tolerance option to prompt guidance for intent matching strictness.
 * low: strict — only match if highly confident, otherwise null operation.
 * high: lenient — always return best match, infer parameters from context.
 * Default: balanced matching (current behavior, no extra guidance).
 * @param {string|undefined} value
 * @returns {string|undefined} Prompt guidance string or undefined
 */
export const mapTolerance = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: "Be strict about matching. Only select an operation if you are highly confident the user's intent matches it. If the input is ambiguous or does not clearly match any operation, set the operation to null and explain the ambiguity. Only extract parameters that are explicitly stated in the input — do not infer or assume values.",
      med: undefined,
      high: 'Be lenient about matching. Always select the closest matching operation even if the match is imperfect. Explain any uncertainty in the optional_parameters field. Infer reasonable parameter values from context even when not explicitly stated. Prefer dispatching to an operation over returning no match.',
    }[value];
  }
  return undefined;
};

const responseFormat = jsonSchema('intent_result', intentSchema);

/**
 * Extract intent and parameters from text based on available operations
 * @param {string} text - The user input text to analyze for intent
 * @param {Array<{name: string, description: string, parameters?: Object}>} operations - Available operations with their parameters
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Intent result with operation, parameters, and optional parameters
 */
export default async function intent(text, operations, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('Operations must be a non-empty array');
    }

    // Validate operations structure
    for (const op of operations) {
      if (!op.name || !op.description) {
        throw new Error('Each operation must have name and description properties');
      }
    }

    const toleranceGuidance = mapTolerance(runConfig.tolerance);

    const operationsText = operations
      .map((op) => {
        let opText = `${op.name}: ${op.description}`;
        if (op.parameters) {
          opText += `\nParameters: ${JSON.stringify(op.parameters)}`;
        }
        return opText;
      })
      .join('\n\n');

    const prompt = `Analyze the user input and determine the most appropriate intent and extract relevant parameters.

${asXML(operationsText, { tag: 'available-operations' })}

${asXML(text, { tag: 'user-input' })}

Determine:
1. Which operation best matches the user's intent
2. Extract any parameters mentioned in the input
3. Identify optional parameters that could be relevant

Return the result as a structured JSON object with the operation name, extracted parameters, and any optional parameters that might be useful.${toleranceGuidance ? `\n\n${toleranceGuidance}` : ''}`;

    const response = await callLlm(prompt, {
      ...runConfig,
      responseFormat,
    });

    emitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
