import * as R from 'ramda';
import { bulkMapRetry } from '../bulk-map/index.js';
import modelService from '../../services/llm-model/index.js';

export const chunkByTokens = (text, maxTokens, model = modelService.getBestPublicModel()) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = [];
  let count = 0;
  words.forEach((word) => {
    const tokens = model.toTokens(word).length;
    if (count + tokens > maxTokens && current.length) {
      chunks.push(current.join(' '));
      current = [word];
      count = tokens;
    } else {
      current.push(word);
      count += tokens;
    }
  });
  if (current.length) {
    chunks.push(current.join(' '));
  }
  return chunks;
};

const mapInstructions =
  'List up to 5 polysemous or ambiguous terms or short phrases found in the text. ' +
  'Return them as a comma-separated list without any other text.';

export default async function polysemy(text, { chunkTokens = 800, topN = 10 } = {}) {
  const model = modelService.getBestPublicModel();
  const chunks = chunkByTokens(text, chunkTokens, model);
  const results = await bulkMapRetry(chunks, mapInstructions, { chunkSize: 5 });

  const terms = results.filter(Boolean).flatMap((r) =>
    r
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  );

  const counts = R.countBy(R.identity, terms);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);
}
