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

  // Handle case where firstPass might be an array or contain extra text
  let rawThemes;
  if (Array.isArray(firstPass)) {
    rawThemes = firstPass.flatMap((item) =>
      typeof item === 'string'
        ? item
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []
    );
  } else if (typeof firstPass === 'string') {
    // Extract only the comma-separated part, ignore explanations
    const lines = firstPass.split('\n');
    const csvLine = lines.find(
      (line) =>
        line.includes(',') &&
        !line.toLowerCase().includes('accumulator') &&
        !line.toLowerCase().includes('theme')
    );
    rawThemes = csvLine
      ? csvLine
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : firstPass
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
  } else {
    rawThemes = [];
  }

  const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
  const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
  const final = await bulkReduce(rawThemes, refinePrompt, { chunkSize, llm, ...options });

  // Handle the final result the same way
  if (Array.isArray(final)) {
    return final.flatMap((item) =>
      typeof item === 'string'
        ? item
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []
    );
  } else if (typeof final === 'string') {
    // Extract only the comma-separated part, ignore explanations
    const lines = final.split('\n');
    const csvLine = lines.find(
      (line) =>
        line.includes(',') &&
        !line.toLowerCase().includes('accumulator') &&
        !line.toLowerCase().includes('theme')
    );
    return csvLine
      ? csvLine
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : final
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
  }

  return [];
}
