import { describe, it, expect, vi } from 'vitest';
import coreference from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockResolvedValue('{"reference":"John"}'),
}));

describe('coreference', () => {
  it('resolves simple pronoun', async () => {
    const text = 'John went home. He slept.';
    const result = await coreference(text, { windowSize: 1 });
    expect(result).toEqual([{ pronoun: 'he', reference: 'John', sentence: 'He slept.' }]);
  });
});
