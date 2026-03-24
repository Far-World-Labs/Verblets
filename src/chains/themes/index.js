import reduce from '../reduce/index.js';
import shuffle from '../../lib/shuffle/index.js';
import { initChain } from '../../lib/context/option.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';

const name = 'themes';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  const { config: scopedConfig, topN } = await initChain(name, config, {
    topN: undefined,
  });
  config = scopedConfig;

  try {
    const pieces = splitText(text);
    const reducePrompt =
      'Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.';
    const shuffledPieces = shuffle(pieces);
    const firstPass = await reduce(shuffledPieces, reducePrompt, config);
    const rawThemes = firstPass
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
    const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
    const final = await reduce(rawThemes, refinePrompt, config);
    const result = final
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    emitChainResult(config, name);

    return result;
  } catch (err) {
    emitChainError(config, name, err);
    throw err;
  }
}
