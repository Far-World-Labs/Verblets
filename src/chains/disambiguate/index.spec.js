import { describe, expect, it, vi } from 'vitest';
import disambiguate from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/List the distinct meanings/.test(text)) {
      return '["dog sound","tree outer layer"]';
    }
    if (/best fits the context/.test(text)) {
      return '"dog sound"';
    }
    return 'undefined';
  }),
}));

describe('disambiguate chain', () => {
  it('selects meaning based on context', async () => {
    const result = await disambiguate({ term: 'bark', context: 'The dog bark was loud' });
    expect(result).toEqual({ term: 'bark', sense: 'dog sound' });
  });
});
