import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';

export default async function peopleList(description, count = 3, config = {}) {
  const { llm, maxAttempts = 3, onProgress, ...options } = config;

  const instructions = asXML(description, { tag: 'description' });
  const prompt = `Create a list of ${count} people based on the following description:

${instructions}`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        modelOptions: {
          response_format: {
            type: 'json_schema',
            json_schema: peopleListJsonSchema,
          },
        },
        ...options,
      }),
    {
      label: `people-list generation for ${count} people`,
      maxAttempts,
      onProgress,
    }
  );

  return response.people;
}
