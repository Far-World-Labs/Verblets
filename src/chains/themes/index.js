import reduce from '../reduce/index.js';
import shuffle from '../../lib/shuffle/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

const name = 'themes';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN } = await getOptions(runConfig, {
    topN: undefined,
  });

  try {
    const pieces = splitText(text);

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'extraction',
    });

    const reducePrompt =
      'Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.';
    const shuffledPieces = shuffle(pieces);
    const firstPass = await reduce(shuffledPieces, reducePrompt, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'themes:extract'),
    });
    const rawThemes = firstPass
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'refinement',
    });

    const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
    const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
    const final = await reduce(rawThemes, refinePrompt, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'themes:refine'),
    });
    const result = final
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    emitter.complete({ outcome: 'success', themes: result.length });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
