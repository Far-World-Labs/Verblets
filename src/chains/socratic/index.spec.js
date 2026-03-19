import { describe, expect, it, vi } from 'vitest';
import { socratic, mapChallenge } from './index.js';

vi.mock('../../lib/llm/index.js', () => {
  let call = 0;
  return {
    default: vi.fn(() => {
      call += 1;
      return call % 2 === 1 ? `Q${call}` : `A${call}`;
    }),
  };
});

describe('socratic chain', () => {
  it('runs dialogue for specified depth', async () => {
    const chain = socratic('topic');
    const result = await chain.run(2);
    expect(result).toHaveLength(2);
    result.forEach((turn) => {
      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');
    });
  });
});

describe('mapChallenge', () => {
  it('returns default config for undefined', () => {
    const result = mapChallenge(undefined);
    expect(result).toStrictEqual({ challenge: undefined, temperature: 0.7 });
  });

  it('returns low challenge with low temperature', () => {
    const result = mapChallenge('low');
    expect(result.challenge).toBe('low');
    expect(result.temperature).toBe(0.3);
  });

  it('returns default config for med', () => {
    const result = mapChallenge('med');
    expect(result).toStrictEqual({ challenge: undefined, temperature: 0.7 });
  });

  it('returns high challenge with high temperature', () => {
    const result = mapChallenge('high');
    expect(result.challenge).toBe('high');
    expect(result.temperature).toBe(0.9);
  });

  it('returns default config for unknown string', () => {
    const result = mapChallenge('medium');
    expect(result).toStrictEqual({ challenge: undefined, temperature: 0.7 });
  });

  it('passes through object values', () => {
    const custom = { challenge: 'low', temperature: 0.5 };
    expect(mapChallenge(custom)).toBe(custom);
  });
});
