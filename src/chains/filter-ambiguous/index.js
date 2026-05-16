import list from '../list/index.js';
import score from '../score/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import parallelBatch from '../../lib/parallel-batch/index.js';

const name = 'filter-ambiguous';

export default async function filterAmbiguous(text, config = {}) {
  const { text: sourceText, known, context } = resolveTexts(text, ['rankedSentences']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN } = await getOptions(runConfig, {
    topN: 10,
  });

  try {
    let rankedSentences;

    if (known.rankedSentences) {
      // Known rankedSentences provided — skip sentence scoring phase
      rankedSentences = JSON.parse(known.rankedSentences);
      if (!Array.isArray(rankedSentences)) {
        throw new Error('filter-ambiguous: known.rankedSentences must parse to an array');
      }
    } else {
      if (!sourceText) {
        emitter.complete({ outcome: Outcome.success });
        return [];
      }
      const sentences = sourceText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (sentences.length === 0) {
        emitter.complete({ outcome: Outcome.success });
        return [];
      }

      const contextBlock = context ? `\n\n${context}` : '';
      const sentenceScores = await score(
        sentences,
        `How ambiguous or easily misinterpreted is this sentence?${contextBlock}`,
        {
          ...runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'score:sentence-ambiguity'),
        }
      );

      // Drop sentences whose score failed entirely instead of coercing to 0
      // (which would silently rank them at the bottom and pretend they were
      // judged). Total failure surfaces as an empty pool below.
      rankedSentences = sentences
        .map((s, i) => ({ sentence: s, score: sentenceScores[i] }))
        .filter((r) => typeof r.score === 'number')
        .toSorted((a, b) => b.score - a.score)
        .slice(0, topN);

      if (rankedSentences.length === 0) {
        throw new Error(`filter-ambiguous: all ${sentences.length} sentences failed to score`);
      }
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'ranked', rankedSentences });

    const batchDone = emitter.batch(rankedSentences.length);
    const batchResults = await parallelBatch(
      rankedSentences,
      async ({ sentence }) => {
        const terms = await list('Ambiguous words or short phrases', {
          ...runConfig,
          attachments: { text: sentence },
          targetNewItemsCount: 5,
          onProgress: scopePhase(runConfig.onProgress, 'list:extract'),
        });
        batchDone(1);
        return terms.map((term) => ({ term, sentence }));
      },
      {
        maxParallel: 3,
        errorPosture: ErrorPosture.resilient,
        abortSignal: runConfig.abortSignal,
        label: 'filter-ambiguous:extract',
      }
    );
    // parallelBatch returns undefined for failed slots; distinguish total
    // failure (every sentence's extraction threw) from legitimate empty
    // (every sentence yielded zero ambiguous terms).
    const failedExtractions = batchResults.filter((r) => r === undefined).length;
    if (failedExtractions === batchResults.length && batchResults.length > 0) {
      throw new Error(
        `filter-ambiguous: all ${batchResults.length} sentences failed term extraction`
      );
    }
    const termPairs = batchResults.flatMap((r) => r ?? []);

    if (termPairs.length === 0) {
      emitter.complete({ outcome: Outcome.success });
      return [];
    }

    const scores = await score(
      termPairs.map((p) => `${p.term} | ${p.sentence}`),
      'Score how ambiguous the term is within the sentence.',
      {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'score:term-ambiguity'),
      }
    );

    // Drop term pairs whose score failed instead of fabricating 0.
    const scored = termPairs
      .map((p, i) => ({ ...p, score: scores[i] }))
      .filter((p) => typeof p.score === 'number');

    if (scored.length === 0) {
      throw new Error(`filter-ambiguous: all ${termPairs.length} term pairs failed to score`);
    }

    const sorted = scored.toSorted((a, b) => b.score - a.score);
    emitter.complete({ outcome: Outcome.success });
    return sorted.slice(0, topN);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

filterAmbiguous.knownTexts = ['rankedSentences'];
