import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

// improbable delimiter string, similar to a multipart form boundary
const defaultDelimiter = '---763927459---';

const buildPrompt = (chunk, instructions, delimiter, context = {}) => {
  const { previousContent = '', targetSplitCount = null } = context;

  let prompt = `You are marking split points in text with "${delimiter}". 

${wrapVariable(instructions, { tag: 'instructions', forceHTML: true })}

IMPORTANT RULES:
- Only insert "${delimiter}" at natural break points - do NOT split mid-sentence
- Each section should be substantively different from adjacent sections
- Preserve ALL original text exactly - only add delimiters
- For topic changes: Look for shifts in subject matter, not just related themes
- Be selective - fewer, more meaningful splits are better than many weak ones`;

  if (targetSplitCount) {
    prompt += `\n- Aim for approximately ${targetSplitCount} sections in this chunk`;
  }

  if (previousContent) {
    prompt += `\n\nPREVIOUS CONTEXT (for continuity):\n${previousContent.slice(-200)}...\n`;
  }

  prompt += `\n\n${wrapVariable(chunk, { tag: 'text-to-process', forceHTML: true })}`;

  return prompt;
};

export default async function split(text, instructions, config = {}) {
  const {
    chunkLen = 4000,
    delimiter = defaultDelimiter,
    maxAttempts = 2,
    llm,
    targetSplitsPerChunk = null,
    ...options
  } = config;

  const chunks = chunkSentences(text, chunkLen);

  // Process chunks in parallel for better performance
  const promises = chunks.map(async (chunk, index) => {
    const context = {
      targetSplitCount: targetSplitsPerChunk,
    };

    const prompt = buildPrompt(chunk, instructions, delimiter, context);
    const run = () =>
      chatGPT(prompt, {
        modelOptions: {
          temperature: 0.1, // Lower temperature for more consistent splitting
          modelName: 'fastGoodCheapCoding', // Use faster model for better performance
          ...llm,
        },
        ...options,
      });

    try {
      const output = await retry(run, { label: 'split', maxRetries: maxAttempts - 1 });

      const outputWithoutDelimiters = output.replace(
        new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        ''
      );
      const originalChunk = chunk.trim();

      // If the output is significantly different, fall back to original
      // Be more lenient for shorter texts (common in tests)
      const maxDifference = originalChunk.length < 100 ? 0.5 : 0.1;
      if (
        Math.abs(outputWithoutDelimiters.length - originalChunk.length) >
        originalChunk.length * maxDifference
      ) {
        console.warn(
          `Split output differs significantly from input for chunk ${
            index + 1
          }, using original chunk`
        );
        return chunk;
      }

      return output;
    } catch (error) {
      console.warn(`Split failed for chunk ${index + 1}:`, error.message);
      return chunk;
    }
  });

  const results = await Promise.all(promises);
  return results.join('');
}
