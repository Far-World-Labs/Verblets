import list from '../list/index.js';
import bulkScore from '../bulk-score/index.js';

export default async function filterAmbiguous(text, { topN = 10, chunkSize = 5 } = {}) {
  if (!text) return [];
  const sentences = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];

  const { scores: sentenceScores } = await bulkScore(
    sentences,
    'How ambiguous or easily misinterpreted is this sentence?',
    { chunkSize }
  );

  const rankedSentences = sentences
    .map((s, i) => ({ sentence: s, score: sentenceScores[i] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  const termPairs = [];
  for (const { sentence } of rankedSentences) {
    // eslint-disable-next-line no-await-in-loop
    const terms = await list('Ambiguous words or short phrases', {
      attachments: { text: sentence },
      targetNewItemsCount: 5,
    });
    terms.forEach((term) => {
      termPairs.push({ term, sentence });
    });
  }

  if (termPairs.length === 0) return [];

  const { scores } = await bulkScore(
    termPairs.map((p) => `${p.term} | ${p.sentence}`),
    'Score how ambiguous the term is within the sentence.',
    { chunkSize }
  );

  const scored = termPairs.map((p, i) => ({ ...p, score: scores[i] }));
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scored.slice(0, topN);
}
