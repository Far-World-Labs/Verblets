import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';

const name = 'people';

async function peopleList(description, count = 3, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { text: descriptionText, context } = resolveTexts(description, []);
    const contextBlock = context ? `\n\n${context}` : '';
    const prompt = `Create a list of ${count} people based on the following description:

${asXML(descriptionText, { tag: 'description' })}${contextBlock}`;

    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema(peopleListJsonSchema.name, peopleListJsonSchema.schema),
        }),
      {
        label: `people-list generation for ${count} people`,
        config: runConfig,
      }
    );

    emitter.complete({ outcome: Outcome.success });

    return response.people;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

peopleList.knownTexts = [];

export default peopleList;
