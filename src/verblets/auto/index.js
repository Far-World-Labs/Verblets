import chatGPT from '../../lib/chatgpt/index.js';
import { schemas } from '../../json-schemas/index.js';

export default async (text, config = {}) => {
  const { llm, ...options } = config;

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

  const functionFound = await chatGPT(text, {
    modelOptions: {
      // toolChoice: 'auto' // by default
      tools,
      ...llm,
    },
    ...options,
  });

  const functionArgs = functionFound.arguments;

  const functionArgsAsArray = Array.isArray(functionArgs) ? functionArgs : [functionArgs];

  return {
    ...functionFound,
    functionArgsAsArray,
  };
};
