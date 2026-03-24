import callLlm from '../../lib/llm/index.js';
import { emitChainResult } from '../../lib/progress-callback/index.js';
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
  const startTime = Date.now();

  const prompt = buildPrompt(description, exampleNames);
  const response = await callLlm(prompt, {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'similar_name',
        schema: nameSimilarSchema,
      },
    },
  });

  emitChainResult(config, name, { duration: Date.now() - startTime });

  return response;
}
