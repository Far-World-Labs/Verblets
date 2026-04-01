import list from '../list/index.js';
import score from '../score/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';

const name = 'filter-ambiguous';

export default async function filterAmbiguous(text, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN } = await getOptions(runConfig, {
    topN: 10,
  });

  try {
    if (!text) {
      emitter.complete({ outcome: 'success' });
      return [];
    }
    const sentences = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length === 0) {
      emitter.complete({ outcome: 'success' });
      return [];
    }

    const sentenceScores = await score(
      sentences,
      'How ambiguous or easily misinterpreted is this sentence?',
      {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'score:sentence-ambiguity'),
      }
    );

    const rankedSentences = sentences
      .map((s, i) => ({ sentence: s, score: sentenceScores[i] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    const batchDone = emitter.batch(rankedSentences.length);
    const termPairs = [];
    for (const { sentence } of rankedSentences) {
      // eslint-disable-next-line no-await-in-loop
      const terms = await list('Ambiguous words or short phrases', {
        ...runConfig,
        attachments: { text: sentence },
        targetNewItemsCount: 5,
      });
      terms.forEach((term) => {
        termPairs.push({ term, sentence });
      });
      batchDone(1);
    }

    if (termPairs.length === 0) {
      emitter.complete({ outcome: 'success' });
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
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    emitter.complete({ outcome: 'success' });
    return scored.slice(0, topN);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
