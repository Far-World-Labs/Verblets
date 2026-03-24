import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';
import { initChain } from '../../lib/context/option.js';
import { emitChainResult } from '../../lib/progress-callback/index.js';

const name = 'people';

export default async function peopleList(description, count = 3, config = {}) {
  ({ config } = await initChain(name, config));

  const instructions = asXML(description, { tag: 'description' });
  const prompt = `Create a list of ${count} people based on the following description:

${instructions}`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        response_format: jsonSchema(peopleListJsonSchema.name, peopleListJsonSchema.schema),
      }),
    {
      label: `people-list generation for ${count} people`,
      config,
    }
  );

  emitChainResult(config, name);

  return response.people;
}
