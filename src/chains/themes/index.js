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

const parseCommaList = (s, label) => {
  if (typeof s !== 'string') {
    throw new Error(
      `themes: expected comma-separated string for ${label} (got ${s === null ? 'null' : typeof s})`
    );
  }
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
};

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

    if (known.rawThemes !== undefined) {
      // Known rawThemes provided — skip extraction phase
      rawThemes = parseCommaList(known.rawThemes, 'known.rawThemes');
    } else {
      // Liberal-empty path: no source text → no themes to extract.
      if (typeof sourceText !== 'string') {
        throw new Error(
          `themes: text must be a string (got ${sourceText === null ? 'null' : typeof sourceText})`
        );
      }
      const pieces = splitText(sourceText);

      if (pieces.length === 0) {
        emitter.complete({ outcome: Outcome.success, themes: 0 });
        return [];
      }

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
      rawThemes = parseCommaList(firstPass, 'extraction reduce result');
    }

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'refinement',
      rawThemes,
    });

    if (rawThemes.length === 0) {
      emitter.complete({ outcome: Outcome.success, themes: 0 });
      return [];
    }

    const limitText = topN ? `Limit to the top ${topN} themes.` : 'Return all meaningful themes.';
    const refinePrompt = `Refine the accumulator by merging similar themes. ${limitText} Return ONLY a comma-separated list with no explanation or additional text.`;
    const final = await reduce(rawThemes, refinePrompt, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'themes:refine'),
    });
    const result = parseCommaList(final, 'refinement reduce result');

    emitter.complete({ outcome: Outcome.success, themes: result.length });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

themes.knownTexts = ['rawThemes'];
