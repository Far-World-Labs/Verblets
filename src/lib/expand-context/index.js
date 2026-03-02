/**
 * Expand retrieved hits with neighboring chunks for richer context.
 *
 * @param {{ start: number, score?: number, text?: string }[]} hits
 * @param {{ start: number, end?: number, text: string }[]} allChunks
 * @param {object} [options]
 * @param {number} [options.windowSize=1] - Neighbors per side to include
 * @returns {{ text: string, start: number, end: number, chunks: object[], score: number }[]}
 */
export default function expandContext(hits, allChunks, options = {}) {
  const { windowSize = 1 } = options;

  const indexByStart = new Map();
  for (let i = 0; i < allChunks.length; i++) {
    indexByStart.set(allChunks[i].start, i);
  }

  const ranges = [];

  for (const hit of hits) {
    const idx = indexByStart.get(hit.start);

    if (idx === undefined) {
      // Hit not found in allChunks — include as-is
      ranges.push({
        lo: -1,
        hi: -1,
        score: hit.score ?? 0,
        standalone: hit,
      });
      continue;
    }

    const lo = Math.max(0, idx - windowSize);
    const hi = Math.min(allChunks.length - 1, idx + windowSize);
    ranges.push({ lo, hi, score: hit.score ?? 0 });
  }

  // Sort by lo position, then merge overlapping
  const indexed = ranges.filter((r) => r.lo !== -1);
  const standalone = ranges.filter((r) => r.lo === -1);

  indexed.sort((a, b) => a.lo - b.lo);

  const merged = [];
  for (const range of indexed) {
    const last = merged[merged.length - 1];
    if (last && range.lo <= last.hi + 1) {
      last.hi = Math.max(last.hi, range.hi);
      last.score = Math.max(last.score, range.score);
    } else {
      merged.push({ ...range });
    }
  }

  const results = [];

  for (const { lo, hi, score } of merged) {
    const chunks = allChunks.slice(lo, hi + 1);
    const text = chunks.map((c) => c.text).join('\n');
    const start = chunks[0].start;
    const lastChunk = chunks[chunks.length - 1];
    const end = lastChunk.end ?? lastChunk.start + lastChunk.text.length;

    results.push({ text, start, end, chunks, score });
  }

  for (const { standalone: hit } of standalone) {
    results.push({
      text: hit.text ?? '',
      start: hit.start,
      end: hit.end ?? hit.start + (hit.text?.length ?? 0),
      chunks: [hit],
      score: hit.score ?? 0,
    });
  }

  return results;
}
