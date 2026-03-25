import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';
import { nameStep, track } from '../../lib/context/option.js';

const name = 'people';

export default async function peopleList(description, count = 3, config = {}) {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);

  const instructions = asXML(description, { tag: 'description' });
  const prompt = `Create a list of ${count} people based on the following description:

${instructions}`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        response_format: jsonSchema(peopleListJsonSchema.name, peopleListJsonSchema.schema),
      }),
    {
      label: `people-list generation for ${count} people`,
      config: runConfig,
    }
  );

  span.result();

  return response.people;
}
