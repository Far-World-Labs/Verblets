import reduce from '../reduce/index.js';
import shuffle from '../../lib/shuffle/index.js';
import { resolveOption } from '../../lib/context/resolve.js';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  const { batchSize = 5, topN: _topN, llm, now = new Date(), ...options } = config;
  const topN = resolveOption('topN', config, undefined);
  const pieces = splitText(text);
  const reducePrompt =
    'Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.';
  const shuffledPieces = shuffle(pieces);
  const firstPass = await reduce(shuffledPieces, reducePrompt, {
    batchSize,
    llm,
    now,
    ...options,
  });
  const rawThemes = firstPass
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
  const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
  const final = await reduce(rawThemes, refinePrompt, {
    batchSize,
    llm,
    now,
    ...options,
  });
  return final
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
