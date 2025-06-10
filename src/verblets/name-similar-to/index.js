import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import outputSuccinctNames from '../../prompts/output-succinct-names.js';

const buildPrompt = (description, examples) => {
  const examplesBlock = examples.length
    ? `${wrapVariable(examples.join('\n'), { tag: 'example-names' })}\n`
    : '';
  const descriptionBlock = wrapVariable(description, { tag: 'description' });

  return `Suggest a single short name for <description> that matches the style of <example-names>.
Return only the name without numbering or extra text.
${outputSuccinctNames(5)}
${examplesBlock}${descriptionBlock}`;
};

export default async function nameSimilarTo(description, exampleNames = [], options) {
  const prompt = buildPrompt(description, exampleNames);
  const output = await chatGPT(prompt, options);
  return output.split('\n')[0].trim();
}
