import callLlm from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { track } from '../../lib/progress-callback/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameSimilarSchema } from './schema.js';

const name = 'name-similar-to';

const buildPrompt = (description, exampleNames) => {
  const descriptionBlock = asXML(description, { tag: 'description' });
  const exampleNamesBlock = asXML(exampleNames.join('\n'), { tag: 'example-names' });

  return `Generate a name similar to the <example-names> that fits the <description>.

${descriptionBlock}

${exampleNamesBlock}

The value should be the generated name.`;
};

export default async function nameSimilarTo(description, exampleNames = [], config = {}) {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);

  const prompt = buildPrompt(description, exampleNames);
  const response = await callLlm(prompt, {
    ...runConfig,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'similar_name',
        schema: nameSimilarSchema,
      },
    },
  });

  span.result();

  return response;
}
