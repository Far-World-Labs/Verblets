import { describe, expect, it } from 'vitest';
import windowFor from './index.js';

describe('windowFor', () => {
  it('creates overlapping windows from a list', () => {
    const fragments = ['A', 'B', 'C', 'D', 'E', 'F'];
    const windows = windowFor(fragments, 3, 50); // 50% overlap, step = 1

    expect(windows).toHaveLength(4); // Should be 4 windows with step=1
    expect(windows[0].fragments).toEqual(['A', 'B', 'C']);
    expect(windows[1].fragments).toEqual(['B', 'C', 'D']);
    expect(windows[2].fragments).toEqual(['C', 'D', 'E']);
    expect(windows[3].fragments).toEqual(['D', 'E', 'F']);
  });

  it('includes correct start and end indices', () => {
    const items = ['x', 'y', 'z', 'w'];
    const windows = windowFor(items, 2, 50);

    expect(windows[0]).toEqual({
      fragments: ['x', 'y'],
      startIndex: 0,
      endIndex: 1,
    });
    expect(windows[1]).toEqual({
      fragments: ['y', 'z'],
      startIndex: 1,
      endIndex: 2,
    });
    expect(windows[2]).toEqual({
      fragments: ['z', 'w'],
      startIndex: 2,
      endIndex: 3,
    });
  });

  it('handles empty arrays', () => {
    const result = windowFor([]);
    expect(result).toEqual([]);
  });

  it('handles single item arrays', () => {
    const result = windowFor(['single']);
    expect(result).toEqual([
      {
        fragments: ['single'],
        startIndex: 0,
        endIndex: 0,
      },
    ]);
  });

  it('works with different window sizes', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    // Small window with no overlap
    const small = windowFor(items, 2, 0); // step = 2
    expect(small).toHaveLength(3);
    expect(small[0].fragments).toEqual(['a', 'b']);
    expect(small[1].fragments).toEqual(['c', 'd']);
    expect(small[2].fragments).toEqual(['e']);

    // Large window with 25% overlap
    const large = windowFor(items, 4, 25); // step = 3
    expect(large).toHaveLength(2);
    expect(large[0].fragments).toEqual(['a', 'b', 'c', 'd']);
    expect(large[1].fragments).toEqual(['d', 'e']);
  });

  it('handles different overlap percentages', () => {
    const items = ['1', '2', '3', '4', '5', '6'];

    // No overlap (0%)
    const noOverlap = windowFor(items, 3, 0);
    expect(noOverlap[0].fragments).toEqual(['1', '2', '3']);
    expect(noOverlap[1].fragments).toEqual(['4', '5', '6']);

    // High overlap - step should be at least 1
    const highOverlap = windowFor(items, 3, 100);
    expect(highOverlap[0].fragments).toEqual(['1', '2', '3']);
    expect(highOverlap[1].fragments).toEqual(['2', '3', '4']);
    expect(highOverlap[2].fragments).toEqual(['3', '4', '5']);
    expect(highOverlap[3].fragments).toEqual(['4', '5', '6']);
  });

  it('ensures minimum step size of 1', () => {
    const items = ['a', 'b', 'c'];
    // Even with 100% overlap, step should be at least 1
    const windows = windowFor(items, 2, 100);

    expect(windows).toHaveLength(2); // Only 2 windows: [a,b] and [b,c]
    expect(windows[0].startIndex).toBe(0);
    expect(windows[1].startIndex).toBe(1);
  });
});
