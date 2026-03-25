import callLlm from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion } = promptConstants;

const verbletName = 'name';

export default async function name(subject, config = {}) {
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);

  const prompt = `${contentIsQuestion} Suggest a concise, memorable name for the <subject>.\n\n${asXML(
    subject,
    {
      tag: 'subject',
    }
  )} ${asUndefinedByDefault}\n\nThe value should be the suggested name.`;

  const response = await callLlm(prompt, {
    ...runConfig,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'name_suggestion',
        schema: nameSchema,
      },
    },
  });

  const result = response === 'undefined' ? undefined : response;

  emitter.result();

  return result;
}
