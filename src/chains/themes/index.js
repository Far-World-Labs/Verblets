import bulkReduce from '../bulk-reduce/index.js';
import shuffle from 'lodash/shuffle.js';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  const { chunkSize = 5, topN, llm, ...options } = config;
  const pieces = splitText(text);
  const reducePrompt =
    'Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.';
  const firstPass = await bulkReduce(shuffle(pieces), reducePrompt, { chunkSize, llm, ...options });
  const rawThemes = firstPass
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
  const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
  const final = await bulkReduce(rawThemes, refinePrompt, { chunkSize, llm, ...options });
  return final
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
