import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameSimilarSchema } from './schema.js';

const verbletName = 'name-similar-to';

const buildPrompt = (description, exampleNames) => {
  const descriptionBlock = asXML(description, { tag: 'description' });
  const exampleNamesBlock = asXML(exampleNames.join('\n'), { tag: 'example-names' });

  return `Generate a name similar to the <example-names> that fits the <description>.

${descriptionBlock}

${exampleNamesBlock}

The value should be the generated name.`;
};

export default async function nameSimilarTo(description, exampleNames = [], config = {}) {
  const { text: inputDescription, context } = resolveTexts(description, []);
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const basePrompt = buildPrompt(inputDescription, exampleNames);
    const prompt = context ? `${basePrompt}\n\n${context}` : basePrompt;
    const response = await callLlm(prompt, {
      ...runConfig,
      responseFormat: jsonSchema('similar_name', nameSimilarSchema),
    });

    emitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

nameSimilarTo.knownTexts = [];
