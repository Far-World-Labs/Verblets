import { describe, expect, it, vi } from 'vitest';
import disambiguate from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    if (/List all distinct dictionary meanings/.test(prompt)) {
      return { meanings: ['financial institution', 'edge of a river'] };
    }
    return { meanings: [] };
  }),
}));

vi.mock('../score/index.js', () => ({
  default: vi.fn(async (list) => {
    return list.map((item, index) => (index === 0 ? 9 : 1)); // First item gets highest score
  }),
}));

describe('disambiguate chain', () => {
  it('selects meaning based on context', async () => {
    const result = await disambiguate({ term: 'bank', context: 'withdraw money' });
    expect(result.meaning).toBe('financial institution');
    expect(result.meanings).toStrictEqual(['financial institution', 'edge of a river']);
  });
});
