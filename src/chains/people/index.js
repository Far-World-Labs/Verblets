import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

export default async function peopleList(description, count = 3, config = {}) {
  const { llm, ...options } = config;

  const instructions = asXML(description, { tag: 'description' });
  const prompt = `Create a list of ${count} people based on the following description:

${instructions}`;

  const schema = {
    type: 'object',
    properties: {
      people: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    required: ['people'],
  };

  const response = await retry(
    () =>
      chatGPT(prompt, {
        modelOptions: {
          response_format: {
            type: 'json_object',
            schema,
            ...llm,
          },
        },
        ...options,
      }),
    {
      label: `people-list generation for ${count} people`,
    }
  );

  const parsed = JSON.parse(typeof response === 'string' ? response : JSON.stringify(response));
  return parsed.people;
}
