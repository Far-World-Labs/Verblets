import { describe, it, expect } from 'vitest';
import expandContext from './index.js';

const makeChunks = (texts) => {
  let offset = 0;
  return texts.map((text) => {
    const chunk = { text, start: offset, end: offset + text.length };
    offset += text.length + 1; // +1 for separator
    return chunk;
  });
};

describe('expandContext', () => {
  const allChunks = makeChunks([
    'Chapter 1 intro',
    'Chapter 1 body',
    'Chapter 1 conclusion',
    'Chapter 2 intro',
    'Chapter 2 body',
  ]);

  it('expands a single hit with windowSize=1 (default)', () => {
    const hits = [{ start: allChunks[2].start, score: 0.9 }];
    const result = expandContext(hits, allChunks);

    expect(result).toHaveLength(1);
    expect(result[0].chunks).toHaveLength(3);
    expect(result[0].text).toContain('Chapter 1 body');
    expect(result[0].text).toContain('Chapter 1 conclusion');
    expect(result[0].text).toContain('Chapter 2 intro');
    expect(result[0].score).toBe(0.9);
    expect(result[0].start).toBe(allChunks[1].start);
    expect(result[0].end).toBe(allChunks[3].end);
  });

  it('merges overlapping ranges and keeps max score', () => {
    const hits = [
      { start: allChunks[1].start, score: 0.7 },
      { start: allChunks[2].start, score: 0.9 },
    ];
    const result = expandContext(hits, allChunks);

    // windowSize=1: [0,2] and [1,3] overlap → merged to [0,3]
    expect(result).toHaveLength(1);
    expect(result[0].chunks).toHaveLength(4);
    expect(result[0].score).toBe(0.9);
    expect(result[0].start).toBe(allChunks[0].start);
  });

  it('handles hit at first position (no left neighbor)', () => {
    const hits = [{ start: allChunks[0].start, score: 0.8 }];
    const result = expandContext(hits, allChunks);

    expect(result).toHaveLength(1);
    expect(result[0].chunks).toHaveLength(2); // [0, 1]
    expect(result[0].start).toBe(allChunks[0].start);
  });

  it('handles hit at last position (no right neighbor)', () => {
    const hits = [{ start: allChunks[4].start, score: 0.8 }];
    const result = expandContext(hits, allChunks);

    expect(result).toHaveLength(1);
    expect(result[0].chunks).toHaveLength(2); // [3, 4]
    expect(result[0].end).toBe(allChunks[4].end);
  });

  it('respects windowSize=0 (no expansion)', () => {
    const hits = [{ start: allChunks[2].start, score: 0.5 }];
    const result = expandContext(hits, allChunks, { windowSize: 0 });

    expect(result).toHaveLength(1);
    expect(result[0].chunks).toHaveLength(1);
    expect(result[0].text).toBe('Chapter 1 conclusion');
  });

  it('handles larger windowSize gracefully', () => {
    const hits = [{ start: allChunks[2].start, score: 0.5 }];
    const result = expandContext(hits, allChunks, { windowSize: 10 });

    expect(result).toHaveLength(1);
    expect(result[0].chunks).toHaveLength(5); // entire corpus
  });

  it('includes hits not found in allChunks as-is (graceful degradation)', () => {
    const orphanHit = { start: 99999, score: 0.6, text: 'orphan chunk' };
    const hits = [{ start: allChunks[0].start, score: 0.8 }, orphanHit];
    const result = expandContext(hits, allChunks);

    expect(result).toHaveLength(2);
    // The orphan should appear with its original text
    const orphanResult = result.find((r) => r.start === 99999);
    expect(orphanResult).toBeDefined();
    expect(orphanResult.text).toBe('orphan chunk');
    expect(orphanResult.score).toBe(0.6);
  });

  it('produces separate ranges for non-overlapping hits', () => {
    const hits = [
      { start: allChunks[0].start, score: 0.9 },
      { start: allChunks[4].start, score: 0.7 },
    ];
    const result = expandContext(hits, allChunks);

    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(0.9);
    expect(result[1].score).toBe(0.7);
  });

  it('returns empty array for empty hits', () => {
    expect(expandContext([], allChunks)).toEqual([]);
  });

  it('defaults score to 0 when not provided', () => {
    const hits = [{ start: allChunks[0].start }];
    const result = expandContext(hits, allChunks);

    expect(result[0].score).toBe(0);
  });
});
