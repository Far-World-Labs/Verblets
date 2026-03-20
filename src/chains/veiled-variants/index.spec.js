import { describe, expect, it, vi } from 'vitest';
import { testObjectMapper } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

import veiledVariants, { mapCoverage } from './index.js';
import callLlm from '../../lib/llm/index.js';

testObjectMapper('mapCoverage', mapCoverage);

describe('veiledVariants', () => {
  it('returns 15 masked queries from 3 framing strategies', async () => {
    let call = 0;
    callLlm.mockImplementation(() => {
      call += 1;
      if (call === 1) return ['s1', 's2', 's3', 's4', 's5'];
      if (call === 2) return ['c1', 'c2', 'c3', 'c4', 'c5'];
      return ['w1', 'w2', 'w3', 'w4', 'w5'];
    });

    const result = await veiledVariants({ prompt: 'secret' });

    expect(Array.isArray(result)).toBe(true);
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

    // Each call should use the sensitive llm and structured output
    callLlm.mock.calls.forEach(([prompt, config]) => {
      expect(prompt).toContain('<intent>');
      expect(config.llm).toEqual({ sensitive: true });
      expect(config.response_format.type).toBe('json_schema');
    });
  });

  it('allows overriding llm', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['a1', 'a2', 'a3', 'a4', 'a5']);

    await veiledVariants({ prompt: 'secret', llm: 'fastGood' });

    callLlm.mock.calls.forEach(([, config]) => {
      expect(config.llm).toBe('fastGood');
    });
  });

  it('uses only 1 strategy with coverage low', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['v1', 'v2', 'v3']);

    const result = await veiledVariants({ prompt: 'secret', coverage: 'low' });

    expect(callLlm).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
    expect(callLlm).toHaveBeenCalledTimes(1);
  });

  it('generates more variants per strategy with coverage high', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);

    const result = await veiledVariants({ prompt: 'secret', coverage: 'high' });

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

    await veiledVariants({
      prompt: 'secret',
      coverage: 'low',
      strategies: ['causal', 'softCover'],
    });

    // Explicit strategies override coverage's single-strategy default
    expect(callLlm).toHaveBeenCalledTimes(2);
  });

  it('forwards extra options to callLlm', async () => {
    callLlm.mockClear();
    callLlm.mockResolvedValue(['x1']);

    await veiledVariants({ prompt: 'test', logger: console });

    callLlm.mock.calls.forEach(([, config]) => {
      expect(config.logger).toBe(console);
    });
  });
});
