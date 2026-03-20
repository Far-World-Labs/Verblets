import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';
import { getOptions, scopeOperation } from '../../lib/context/option.js';

export default async function peopleList(description, count = 3, config = {}) {
  config = scopeOperation('people', config);
  const { maxAttempts, retryDelay, retryOnAll } = await getOptions(config, {
    maxAttempts: 3,
    retryDelay: 1000,
    retryOnAll: false,
  });

  const instructions = asXML(description, { tag: 'description' });
  const prompt = `Create a list of ${count} people based on the following description:

${instructions}`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        response_format: {
          type: 'json_schema',
          json_schema: peopleListJsonSchema,
        },
      }),
    {
      label: `people-list generation for ${count} people`,
      maxAttempts,
      retryDelay,
      retryOnAll,
      onProgress: config.onProgress,
      abortSignal: config.abortSignal,
    }
  );

  return response.people;
}
