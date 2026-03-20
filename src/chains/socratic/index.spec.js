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
    const chain = await socratic('topic');
    const result = await chain.run(2);
    expect(result).toHaveLength(2);
    result.forEach((turn) => {
      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');
    });
  });
});

describe('mapChallenge', () => {
  it('all levels return same shape', () => {
    const keys = ['low', 'med', 'high'].map((l) => Object.keys(mapChallenge(l)).sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[1]).toEqual(keys[2]);
  });

  it('undefined returns default', () => {
    expect(mapChallenge(undefined)).toBeDefined();
    expect(typeof mapChallenge(undefined)).toBe('object');
  });

  it('passes through object for power consumers', () => {
    const custom = { a: 1, b: 2 };
    expect(mapChallenge(custom)).toBe(custom);
  });

  it('unknown string falls back to default', () => {
    expect(mapChallenge('zzz')).toEqual(mapChallenge(undefined));
  });
});
