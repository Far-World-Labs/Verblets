import { describe, expect, it, vi } from 'vitest';
import disambiguate from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    if (/List all distinct dictionary meanings/.test(prompt)) {
      return '["financial institution","edge of a river"]';
    }
    return '[]';
  }),
}));

vi.mock('../../verblets/list-filter/index.js', () => ({
  default: vi.fn(async (list) => {
    return [list[0]];
  }),
}));

describe('disambiguate chain', () => {
  it('selects meaning based on context', async () => {
    const result = await disambiguate({ term: 'bank', context: 'withdraw money' });
    expect(result.meaning).toBe('financial institution');
    expect(result.meanings).toStrictEqual(['financial institution', 'edge of a river']);
  });
});
