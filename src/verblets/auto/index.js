import callLlm from '../../lib/llm/index.js';
import { nameStep, track } from '../../lib/context/option.js';
import { schemas as defaultSchemas } from '../../json-schemas/index.js';

const name = 'auto';

export default async (text, config = {}) => {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);

  // Use provided schemas or fall back to default schemas
  const schemasToUse = runConfig.schemas || defaultSchemas;

  // Convert JSON schemas to OpenAI function tools format
  const tools = Object.entries(schemasToUse).map(([schemaName, schema]) => ({
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

  const response = await callLlm(text, {
    ...runConfig,
    // toolChoice: 'auto' // by default
    tools,
  });

  let result;

  // Check if a function was called or if we got a text response
  if (typeof response === 'string') {
    // No function was selected, return a no-match indicator
    result = {
      name: runConfig.defaultFunction || null,
      arguments: runConfig.defaultArguments || {},
      noMatch: true,
      reason: response,
      functionArgsAsArray: [runConfig.defaultArguments || {}],
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

  span.result();

  return result;
};
