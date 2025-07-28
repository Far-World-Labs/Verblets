import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/index.js';
import { intent as intentSchema } from '../../json-schemas/index.js';

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(llm = 'fastGoodCheap') {
  const schema = intentSchema;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'intent_result',
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
 * Extract intent and parameters from text based on available operations
 * @param {string} text - The user input text to analyze for intent
 * @param {Array<{name: string, description: string, parameters?: Object}>} operations - Available operations with their parameters
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Intent result with operation, parameters, and optional parameters
 */
export default async function intent(text, operations, config = {}) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('Operations must be a non-empty array');
  }

  // Validate operations structure
  for (const op of operations) {
    if (!op.name || !op.description) {
      throw new Error('Each operation must have name and description properties');
    }
  }

  const { llm, ...options } = config;

  // Build operations list with parameters
  const operationsText = operations
    .map((op) => {
      let opText = `${op.name}: ${op.description}`;
      if (op.parameters) {
        opText += `\nParameters: ${JSON.stringify(op.parameters)}`;
      }
      return opText;
    })
    .join('\n\n');

  // Create structured prompt using asXML
  const prompt = `Analyze the user input and determine the most appropriate intent and extract relevant parameters.

${asXML(operationsText, { tag: 'available-operations' })}

${asXML(text, { tag: 'user-input' })}

Determine:
1. Which operation best matches the user's intent
2. Extract any parameters mentioned in the input
3. Identify optional parameters that could be relevant

Return the result as a structured JSON object with the operation name, extracted parameters, and any optional parameters that might be useful.`;

  const modelOptions = createModelOptions(llm);
  const response = await chatGPT(prompt, { modelOptions, ...options });

  return response;
}
