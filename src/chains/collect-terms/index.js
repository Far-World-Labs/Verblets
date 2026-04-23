import list from '../list/index.js';
import score from '../score/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import parallelBatch from '../../lib/parallel-batch/index.js';

const name = 'collect-terms';

const splitIntoChunks = (text, maxLen) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
};

export default async function collectTerms(text, config = {}) {
  const { text: sourceText, known, context } = resolveTexts(text, ['uniqueTerms']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN, chunkLen } = await getOptions(runConfig, {
    topN: 20,
    chunkLen: 1000,
  });

  try {
    let uniqueTerms;

    if (known.uniqueTerms) {
      // Known uniqueTerms provided — skip extraction phase
      uniqueTerms = known.uniqueTerms
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      const chunks = splitIntoChunks(sourceText, chunkLen);
      const batchDone = emitter.batch(chunks.length);

      // Collect terms from each chunk
      const chunkResults = await parallelBatch(
        chunks,
        async (chunk) => {
          const contextBlock = context ? `\n\n${context}` : '';
          const terms = await list(
            `key words and phrases that would help find documents about: ${chunk}${contextBlock}`,
            { ...runConfig, onProgress: scopePhase(runConfig.onProgress, 'list:extract') }
          );
          batchDone(1);
          return terms;
        },
        {
          maxParallel: 3,
          errorPosture: ErrorPosture.resilient,
          abortSignal: runConfig.abortSignal,
          label: 'collect-terms:extract',
        }
      );
      const allTerms = chunkResults.filter(Array.isArray).flat();

      uniqueTerms = Array.from(new Set(allTerms.map((t) => t.trim()))).filter(Boolean);
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'extracted', uniqueTerms });

    // If we already have fewer terms than requested, return them all
    if (uniqueTerms.length <= topN) {
      emitter.complete({ outcome: Outcome.success });
      return uniqueTerms;
    }

    // Score each term by relevance to the full text context
    const scores = await score(
      uniqueTerms,
      `relevance as a search term for finding information (1-10, higher is more important)`,
      { ...runConfig, onProgress: scopePhase(runConfig.onProgress, 'score:rank') }
    );

    // Sort by score and take top N
    const termsWithScores = uniqueTerms.map((term, i) => ({ term, score: scores[i] ?? 0 }));
    const sorted = termsWithScores.toSorted((a, b) => b.score - a.score);
    emitter.emit({ event: DomainEvent.phase, phase: 'scored', termsWithScores: sorted });

    emitter.complete({ outcome: Outcome.success });

    return sorted.slice(0, topN).map((item) => item.term);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

collectTerms.knownTexts = ['uniqueTerms'];
