import chatGPT from '../../lib/chatgpt/index.js';
import { schemas as defaultSchemas } from '../../json-schemas/index.js';

export default async (text, config = {}) => {
  const { llm, schemas, ...options } = config;

  // Use provided schemas or fall back to default schemas
  const schemasToUse = schemas || defaultSchemas;

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

  const response = await chatGPT(text, {
    modelOptions: {
      // toolChoice: 'auto' // by default
      tools,
      ...llm,
    },
    ...options,
  });

  // Check if a function was called or if we got a text response
  if (typeof response === 'string') {
    // No function was selected, return a no-match indicator
    return {
      name: config.defaultFunction || null,
      arguments: config.defaultArguments || {},
      noMatch: true,
      reason: response,
      functionArgsAsArray: [config.defaultArguments || {}],
    };
  }

  // Function was called successfully
  const functionArgs = response.arguments;
  const functionArgsAsArray = Array.isArray(functionArgs) ? functionArgs : [functionArgs];

  return {
    ...response,
    functionArgsAsArray,
    noMatch: false,
  };
};
