import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameSimilarSchema } from './schema.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { asJSON, asWrappedValueJSON } = promptConstants;

const buildPrompt = (description, exampleNames) => {
  const descriptionBlock = asXML(description, { tag: 'description' });
  const exampleNamesBlock = asXML(exampleNames.join('\n'), { tag: 'example-names' });

  return `Generate a name similar to the <example-names> that fits the <description>.

${descriptionBlock}

${exampleNamesBlock}

${asWrappedValueJSON} The value should be the generated name.

${asJSON}`;
};

export default async function nameSimilarTo(description, exampleNames = [], config = {}) {
  const { llm, ...options } = config;
  const prompt = buildPrompt(description, exampleNames);
  const response = await chatGPT(prompt, {
    modelOptions: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'similar_name',
          schema: nameSimilarSchema,
        },
      },
    },
    ...options,
  });
  return response;
}
