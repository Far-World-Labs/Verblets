import reduce from '../reduce/index.js';
import shuffle from '../../lib/shuffle/index.js';
import { nameStep, track, getOptions } from '../../lib/context/option.js';

const name = 'themes';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);
  const { topN } = await getOptions(runConfig, {
    topN: undefined,
  });

  const pieces = splitText(text);
  const reducePrompt =
    'Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.';
  const shuffledPieces = shuffle(pieces);
  const firstPass = await reduce(shuffledPieces, reducePrompt, runConfig);
  const rawThemes = firstPass
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
  const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
  const final = await reduce(rawThemes, refinePrompt, runConfig);
  const result = final
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  span.result();

  return result;
}
