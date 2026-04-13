import reduce from '../reduce/index.js';
import shuffle from '../../lib/shuffle/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';

const name = 'themes';

const splitText = (text) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export default async function themes(text, config = {}) {
  const { text: sourceText, known, context } = resolveTexts(text, ['rawThemes']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN } = await getOptions(runConfig, {
    topN: undefined,
  });

  try {
    let rawThemes;

    if (known.rawThemes) {
      // Known rawThemes provided — skip extraction phase
      rawThemes = known.rawThemes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      const pieces = splitText(sourceText);

      emitter.emit({
        event: DomainEvent.phase,
        phase: 'extraction',
      });

      const contextBlock = context ? `\n\n${context}` : '';
      const reducePrompt = `Update the accumulator with short themes from this text. Avoid duplicates. Return ONLY a comma-separated list of themes with no explanation or additional text.${contextBlock}`;
      const shuffledPieces = shuffle(pieces);
      const firstPass = await reduce(shuffledPieces, reducePrompt, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'themes:extract'),
      });
      rawThemes = firstPass
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'refinement',
      rawThemes,
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

    emitter.complete({ outcome: Outcome.success, themes: result.length });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

themes.knownTexts = ['rawThemes'];
