import callLlm from '../../lib/llm/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { schemas as defaultSchemas } from '../../json-schemas/index.js';

const verbletName = 'auto';

export default async function auto(text, config = {}) {
  const { text: inputText, context } = resolveTexts(text, []);
  const effectiveText = context ? `${inputText}\n\n${context}` : inputText;
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  const { schemas, defaultFunction, defaultArguments } = await getOptions(runConfig, {
    schemas: defaultSchemas,
    defaultFunction: undefined,
    defaultArguments: {},
  });

  // Convert JSON schemas to OpenAI function tools format
  const tools = Object.entries(schemas).map(([schemaName, schema]) => ({
    type: 'function',
    function: {
      name: schemaName,
      description: schema.description || `Function for ${schemaName}`,
      parameters: {
        type: 'object',
        properties: schema.properties || {},
        required: schema.required || [],
      },
    },
  }));

  try {
    const response = await callLlm(effectiveText, {
      ...runConfig,
      // toolChoice: 'auto' // by default
      tools,
    });

    let result;

    // Check if a function was called or if we got a text response
    if (typeof response === 'string') {
      // No function was selected, return a no-match indicator
      result = {
        name: defaultFunction,
        arguments: defaultArguments,
        noMatch: true,
        reason: response,
        functionArgsAsArray: [defaultArguments],
      };
    } else {
      // Function was called successfully
      const functionArgs = response.arguments;
      const functionArgsAsArray = Array.isArray(functionArgs) ? functionArgs : [functionArgs];

      result = {
        ...response,
        functionArgsAsArray,
        noMatch: false,
      };
    }

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

auto.knownTexts = [];
