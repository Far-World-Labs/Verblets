import reduce from '../reduce/index.js';
import shuffle from '../../lib/shuffle/index.js';
import { resolveAll, withOperation } from '../../lib/context/resolve.js';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  config = withOperation('themes', config);
  const { llm, topN } = await resolveAll(config, {
    llm: undefined,
    topN: undefined,
  });
  const pieces = splitText(text);
  const reducePrompt =
    'Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.';
  const shuffledPieces = shuffle(pieces);
  const firstPass = await reduce(shuffledPieces, reducePrompt, {
    ...config,
    llm,
  });
  const rawThemes = firstPass
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
  const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
  const final = await reduce(rawThemes, refinePrompt, {
    ...config,
    llm,
  });
  return final
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
