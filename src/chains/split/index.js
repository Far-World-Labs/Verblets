import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';

// improbable delimiter string, similar to a multipart form boundary
const defaultDelimiter = '---763927459---';

const buildPrompt = (chunk, instructions, delimiter) => {
  return `Mark split points with "${delimiter}" where ${instructions}. Return only the text with delimiters.\n\n${chunk}`;
};

export default async function split(text, instructions, config = {}) {
  const {
    chunkLen = 4000,
    delimiter = defaultDelimiter,
    maxAttempts = 2,
    llm,
    ...options
  } = config;

  const chunks = chunkSentences(text, chunkLen);
  const results = [];
  for (const chunk of chunks) {
    const prompt = buildPrompt(chunk, instructions, delimiter);
    const run = () => chatGPT(prompt, { modelOptions: { ...llm }, ...options });
    let output;
    try {
      // eslint-disable-next-line no-await-in-loop
      output = await retry(run, { label: 'split', maxRetries: maxAttempts - 1 });
    } catch {
      output = chunk;
    }
    results.push(output);
  }
  return results.join('');
}
