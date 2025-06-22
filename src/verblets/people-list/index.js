import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

export default async function peopleList(schemaDescription, count = 3, config = {}) {
  const { llm, ...options } = config;
  const instructions = wrapVariable(schemaDescription, { tag: 'schema' });
  const prompt =
    `Create a list of ${count} people that match <schema>. Each entry must include a name and description. Respond with a JSON array.` +
    `\n\n${instructions}`;
  const response = await chatGPT(prompt, {
    modelOptions: { response_format: { type: 'json_object' }, ...llm },
    ...options,
  });
  return JSON.parse(typeof response === 'string' ? response : JSON.stringify(response));
}
