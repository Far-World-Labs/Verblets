import chatGPT from '../../lib/chatgpt/index.js';
import schemas from '../../json-schemas/index.js';

export default async (text, options = {}) => {
  const tools = schemas.map((schema) => ({
    type: 'function',
    function: schema,
  }));

  const functionFound = await chatGPT(text, {
    modelOptions: {
      // toolChoice: 'auto' // by default
      tools,
    },
    ...options,
  });

  const functionArgs = functionFound.arguments;

  const functionArgsAsArray = Array.isArray(functionArgs)
    ? functionArgs
    : [functionArgs];

  return {
    ...functionFound,
    functionArgsAsArray,
  };
};
