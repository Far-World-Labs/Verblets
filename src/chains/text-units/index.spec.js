import { describe, expect, it, vi } from 'vitest';
import textUnits from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async () => '[{"type":"sentence","start":0,"end":12}]'),
}));

describe('text-units chain', () => {
  it('returns detected units', async () => {
    const result = await textUnits('Hello world.');
    expect(result).toStrictEqual([{ type: 'sentence', start: 0, end: 12 }]);
  });
});
