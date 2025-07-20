import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion, asJSON, asWrappedValueJSON } = promptConstants;

export default async function name(subject, config = {}) {
  const { llm, ...options } = config;
  const prompt = `${contentIsQuestion} Suggest a concise, memorable name for the <subject>.\n\n${asXML(
    subject,
    {
      tag: 'subject',
    }
  )} ${asUndefinedByDefault}\n\n${asWrappedValueJSON} The value should be the suggested name.\n\n${asJSON}`;

  const response = await chatGPT(prompt, {
    modelOptions: {
      ...llm,
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
