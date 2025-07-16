import { asXML } from './wrap-variable.js';

export default (text, instructions = '') => {
  const instructionsBlock = instructions
    ? `${asXML(instructions, { tag: 'summarization-instructions' })}`
    : `${asXML(
        'Create a concise summary focusing on key points, main ideas, and essential information',
        { tag: 'summarization-instructions' }
      )}`;

  return `Summarize the content below according to the instructions provided.

${instructionsBlock}

IMPORTANT:
- Extract the most significant information
- Maintain clarity and coherence
- Preserve critical details while reducing length
- Ensure the summary captures the essence of the original content

${asXML(text, { tag: 'content-to-summarize' })}`;
};
