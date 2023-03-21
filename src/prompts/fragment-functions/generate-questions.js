import { onlyJSON } from '../fragment-texts/index.js';

export default (text, { existing=[], openEnded }={}) => {
  const existingJoined = existing
        .map(item => `"${item}"`)
        .join(', ');

  return `Instead of answering the following question, I would like you to generate additional questions you might ask. Don't dumb down the questions. Assume you are expert in the topic.

Question: ${text}

Do not use any of the following questions:
\`\`\`
${existingJoined}
\`\`\`

Return the results as a JSON array of strings, one question per string.
${onlyJSON}`
};
