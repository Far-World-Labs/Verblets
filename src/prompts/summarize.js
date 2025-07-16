import { asXML } from './wrap-variable.js';

export default (text, instructions = '') => {
  const basePrompt = instructions
    ? 'Create a summary of the following content according to the provided instructions.'
    : 'Create a concise summary of the following content. Focus on key points, main ideas, and essential information. Maintain clarity and coherence while reducing length.';

  return `${basePrompt}

${asXML(instructions, {
  tag: 'summarization-instructions',
})}

${asXML(text, { tag: 'content-to-summarize' })}`;
};
