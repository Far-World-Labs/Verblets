import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { nameSchema } from './schema.js';

const { asUndefinedByDefault, contentIsQuestion } = promptConstants;

const verbletName = 'name';

export default async function name(subject, config = {}) {
  const { text: inputSubject, context } = resolveTexts(subject, []);
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  const prompt = [
    `${contentIsQuestion} Suggest a concise, memorable name for the <subject>.\n\n${asXML(
      inputSubject,
      {
        tag: 'subject',
      }
    )} ${asUndefinedByDefault}\n\nThe value should be the suggested name.`,
    context,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const response = await callLlm(prompt, {
      ...runConfig,
      responseFormat: jsonSchema('name_suggestion', nameSchema),
    });

    const result = response === 'undefined' ? undefined : response;

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

name.knownTexts = [];
