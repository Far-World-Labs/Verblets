/**
 * Build an index mapping chunk start positions to array indices.
 *
 * @param {{ start: number }[]} allChunks
 * @returns {Map<number, number>}
 */
export function buildIndex(allChunks) {
  const indexByStart = new Map();
  for (let i = 0; i < allChunks.length; i++) {
    indexByStart.set(allChunks[i].start, i);
  }
  return indexByStart;
}

/**
 * Merge sorted, overlapping or adjacent ranges, keeping the max score.
 *
 * @param {{ lo: number, hi: number, score: number }[]} ranges - sorted by lo
 * @returns {{ lo: number, hi: number, score: number }[]}
 */
export function mergeRanges(ranges) {
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.lo <= last.hi + 1) {
      last.hi = Math.max(last.hi, range.hi);
      last.score = Math.max(last.score, range.score);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/**
 * Assemble a span result from a contiguous range of chunks.
 *
 * @param {{ start: number, end?: number, text: string }[]} allChunks
 * @param {number} lo
 * @param {number} hi
 * @param {number} score
 * @returns {{ text: string, start: number, end: number, chunks: object[], score: number }}
 */
export function assembleSpan(allChunks, lo, hi, score) {
  const chunks = allChunks.slice(lo, hi + 1);
  const text = chunks.map((c) => c.text).join('\n');
  const start = chunks[0].start;
  const lastChunk = chunks[chunks.length - 1];
  const end = lastChunk.end ?? lastChunk.start + lastChunk.text.length;
  return { text, start, end, chunks, score };
}

/**
 * Build a span result from a standalone hit not found in allChunks.
 *
 * @param {{ start: number, end?: number, text?: string, score?: number }} hit
 * @returns {{ text: string, start: number, end: number, chunks: object[], score: number }}
 */
export function standaloneSpan(hit) {
  return {
    text: hit.text ?? '',
    start: hit.start,
    end: hit.end ?? hit.start + (hit.text?.length ?? 0),
    chunks: [hit],
    score: hit.score ?? 0,
  };
}

/**
 * Expand retrieved hits with neighboring chunks for richer context.
 *
 * @param {{ start: number, score?: number, text?: string }[]} hits
 * @param {{ start: number, end?: number, text: string }[]} allChunks
 * @param {object} [options]
 * @param {number} [options.windowSize=1] - Neighbors per side to include
 * @returns {{ text: string, start: number, end: number, chunks: object[], score: number }[]}
 */
export default function embedNeighborChunks(hits, allChunks, options = {}) {
  const { windowSize = 1 } = options;
  const indexByStart = buildIndex(allChunks);

  const indexed = [];
  const standalone = [];

  for (const hit of hits) {
    const idx = indexByStart.get(hit.start);
    if (idx === undefined) {
      standalone.push(hit);
      continue;
    }
    const lo = Math.max(0, idx - windowSize);
    const hi = Math.min(allChunks.length - 1, idx + windowSize);
    indexed.push({ lo, hi, score: hit.score ?? 0 });
  }

  const sorted = indexed.toSorted((a, b) => a.lo - b.lo);
  const merged = mergeRanges(sorted);

  const results = merged.map(({ lo, hi, score }) => assembleSpan(allChunks, lo, hi, score));

  for (const hit of standalone) {
    results.push(standaloneSpan(hit));
  }

  return results;
}
