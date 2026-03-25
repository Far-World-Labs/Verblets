import list from '../list/index.js';
import score from '../score/index.js';
import { nameStep, track, getOptions } from '../../lib/context/option.js';

const name = 'filter-ambiguous';

export default async function filterAmbiguous(text, config = {}) {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);
  const { topN } = await getOptions(runConfig, {
    topN: 10,
  });

  const complete = (result) => {
    span.result();
    return result;
  };

  if (!text) return complete([]);
  const sentences = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return complete([]);

  const sentenceScores = await score(
    sentences,
    'How ambiguous or easily misinterpreted is this sentence?',
    runConfig
  );

  const rankedSentences = sentences
    .map((s, i) => ({ sentence: s, score: sentenceScores[i] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

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
  }

  if (termPairs.length === 0) return complete([]);

  const scores = await score(
    termPairs.map((p) => `${p.term} | ${p.sentence}`),
    'Score how ambiguous the term is within the sentence.',
    runConfig
  );

  const scored = termPairs.map((p, i) => ({ ...p, score: scores[i] }));
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return complete(scored.slice(0, topN));
}
