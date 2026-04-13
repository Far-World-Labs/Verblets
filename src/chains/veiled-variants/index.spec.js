import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

import veiledVariants from './index.js';
import callLlm from '../../lib/llm/index.js';

describe('veiledVariants', () => {
  it('returns 15 masked queries from 3 framing strategies', async () => {
    let call = 0;
    callLlm.mockImplementation(() => {
      call += 1;
      if (call === 1) return ['s1', 's2', 's3', 's4', 's5'];
      if (call === 2) return ['c1', 'c2', 'c3', 'c4', 'c5'];
      return ['w1', 'w2', 'w3', 'w4', 'w5'];
    });

    const result = await veiledVariants('secret');

    expect(result).toHaveLength(15);
    expect(result).toEqual([
      's1',
      's2',
      's3',
      's4',
      's5',
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
      'w1',
      'w2',
      'w3',
      'w4',
      'w5',
    ]);
    expect(callLlm).toHaveBeenCalledTimes(3);

    // Each call should contain the intent in the prompt
    callLlm.mock.calls.forEach(([prompt]) => {
      expect(prompt).toContain('<intent>');
    });
  });

  it('uses only 1 strategy with coverage low', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['v1', 'v2', 'v3']);

    const result = await veiledVariants('secret', { coverage: 'low' });

    expect(callLlm).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
    expect(callLlm).toHaveBeenCalledTimes(1);
  });

  it('generates more variants per strategy with coverage high', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);

    const result = await veiledVariants('secret', { coverage: 'high' });

    expect(callLlm).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(24);
    // Each prompt should include the variant count
    callLlm.mock.calls.forEach(([prompt]) => {
      expect(prompt).toMatch(/\b8\b/);
    });
  });

  it('allows explicit strategies to override coverage', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['v1', 'v2', 'v3']);

    await veiledVariants('secret', {
      coverage: 'low',
      strategies: ['causal', 'softCover'],
    });

    // Explicit strategies override coverage's single-strategy default
    expect(callLlm).toHaveBeenCalledTimes(2);
  });
});
