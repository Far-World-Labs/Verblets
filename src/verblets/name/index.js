import callLlm from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion } = promptConstants;

export default async function name(subject, config = {}) {
  const { llm, ...options } = config;
  const prompt = `${contentIsQuestion} Suggest a concise, memorable name for the <subject>.\n\n${asXML(
    subject,
    {
      tag: 'subject',
    }
  )} ${asUndefinedByDefault}\n\nThe value should be the suggested name.`;

  const response = await callLlm(prompt, {
    llm,
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'name_suggestion',
          schema: nameSchema,
        },
      },
    },
    ...options,
  });

  return response === 'undefined' ? undefined : response;
}
