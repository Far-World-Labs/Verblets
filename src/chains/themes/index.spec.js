import { describe, it, expect, vi, beforeEach } from 'vitest';
import themes from './index.js';
import reduce from '../reduce/index.js';

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('themes chain', () => {
  it('reduces in two passes and returns trimmed themes', async () => {
    reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, c');
    const text = 'paragraph one\n\nparagraph two';
    const result = await themes(text, { batchSize: 1, topN: 2 });
    expect(result).toStrictEqual(['a', 'c']);
    expect(reduce).toHaveBeenCalledTimes(2);
  });

  it('splits text on double newlines into paragraphs', async () => {
    reduce.mockResolvedValueOnce('theme').mockResolvedValueOnce('theme');
    await themes('first\n\nsecond\n\nthird');
    // First call receives the shuffled paragraphs as list
    const firstCallList = reduce.mock.calls[0][0];
    expect(firstCallList).toHaveLength(3);
    expect(firstCallList.toSorted()).toStrictEqual(['first', 'second', 'third']);
  });

  it('passes topN to the refinement prompt', async () => {
    reduce.mockResolvedValueOnce('a, b, c').mockResolvedValueOnce('a, b');
    await themes('x\n\ny', { topN: 2 });
    const refinePrompt = reduce.mock.calls[1][1];
    expect(refinePrompt).toContain('top 2');
  });

  it('omits topN limit when not specified', async () => {
    reduce.mockResolvedValueOnce('a, b').mockResolvedValueOnce('a, b');
    await themes('x\n\ny');
    const refinePrompt = reduce.mock.calls[1][1];
    expect(refinePrompt).toContain('Return all meaningful themes');
    expect(refinePrompt).not.toContain('top');
  });

  it('feeds first pass themes as list into second reduce', async () => {
    reduce.mockResolvedValueOnce('alpha, beta, gamma').mockResolvedValueOnce('alpha, gamma');
    await themes('x\n\ny');
    const secondCallList = reduce.mock.calls[1][0];
    expect(secondCallList).toStrictEqual(['alpha', 'beta', 'gamma']);
  });

  it('filters empty strings from comma-split results', async () => {
    reduce.mockResolvedValueOnce('a,, b, ,c').mockResolvedValueOnce('a,, ,c');
    const result = await themes('x\n\ny');
    expect(result).toStrictEqual(['a', 'c']);
  });

  it('handles single paragraph text', async () => {
    reduce.mockResolvedValueOnce('solo').mockResolvedValueOnce('solo');
    const result = await themes('just one paragraph');
    expect(result).toStrictEqual(['solo']);
    const firstCallList = reduce.mock.calls[0][0];
    expect(firstCallList).toStrictEqual(['just one paragraph']);
  });
});
