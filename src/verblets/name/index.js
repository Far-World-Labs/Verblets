import callLlm from '../../lib/llm/index.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion } = promptConstants;

const verbletName = 'name';

export default async function name(subject, config = {}) {
  const startTime = Date.now();

  try {
    const prompt = `${contentIsQuestion} Suggest a concise, memorable name for the <subject>.\n\n${asXML(
      subject,
      {
        tag: 'subject',
      }
    )} ${asUndefinedByDefault}\n\nThe value should be the suggested name.`;

    const response = await callLlm(prompt, {
      ...config,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'name_suggestion',
          schema: nameSchema,
        },
      },
    });

    const result = response === 'undefined' ? undefined : response;

    emitChainResult(config, verbletName, { duration: Date.now() - startTime });

    return result;
  } catch (err) {
    emitChainError(config, verbletName, err, { duration: Date.now() - startTime });

    throw err;
  }
}
