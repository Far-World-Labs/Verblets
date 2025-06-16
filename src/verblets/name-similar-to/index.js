import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

const buildPrompt = (description, exampleNames) => {
  const descriptionBlock = wrapVariable(description, { tag: 'description' });
  const exampleNamesBlock = wrapVariable(exampleNames.join('\n'), { tag: 'example-names' });

  return `Generate a name similar to the <example-names> that fits the <description>. Return only the name, nothing else.

${descriptionBlock}

${exampleNamesBlock}`;
};

export default async function nameSimilarTo(description, exampleNames = [], config = {}) {
  const { llm, ...options } = config;
  const prompt = buildPrompt(description, exampleNames);
  const output = await chatGPT(prompt, { modelOptions: { ...llm }, ...options });
  return output.split('\n')[0].trim();
}
