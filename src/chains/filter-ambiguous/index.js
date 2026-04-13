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

      rankedSentences = sentences
        .map((s, i) => ({ sentence: s, score: sentenceScores[i] ?? 0 }))
        .toSorted((a, b) => b.score - a.score)
        .slice(0, topN);
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
    const termPairs = batchResults.flat();

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

    const scored = termPairs.map((p, i) => ({ ...p, score: scores[i] }));
    const sorted = scored.toSorted((a, b) => (b.score || 0) - (a.score || 0));
    emitter.complete({ outcome: Outcome.success });
    return sorted.slice(0, topN);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

filterAmbiguous.knownTexts = ['rankedSentences'];
