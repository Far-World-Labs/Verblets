import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';

export default async function peopleList(description, count = 3, config = {}) {
  const { llm, ...options } = config;

  const instructions = asXML(description, { tag: 'description' });
  const prompt = `Create a list of ${count} people based on the following description:

${instructions}`;

  const response = await retry(
    () =>
      chatGPT(prompt, {
        modelOptions: {
          ...llm,
          response_format: {
            type: 'json_schema',
            json_schema: peopleListJsonSchema,
          },
        },
        ...options,
      }),
    {
      label: `people-list generation for ${count} people`,
    }
  );

  return response.people;
}
