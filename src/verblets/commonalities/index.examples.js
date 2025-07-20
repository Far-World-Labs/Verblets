import { describe, it, expect } from 'vitest';
import commonalities from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import aiExpect from '../../chains/expect/index.js';

describe('commonalities verblet', () => {
  it('finds shared traits between technology devices', async () => {
    const result = await commonalities(['smartphone', 'tablet', 'laptop']);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Should find commonalities like portable electronics, computing devices, etc.
    expect(
      result.some(
        (item) =>
          item.toLowerCase().includes('electronic') ||
          item.toLowerCase().includes('portable') ||
          item.toLowerCase().includes('computing')
      )
    ).toBe(true);
  });

  it('identifies commonalities in transportation methods', async () => {
    const result = await commonalities(['car', 'bicycle', 'motorcycle'], {
      instructions: 'focus on transportation methods available in a city',
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Should find transportation-related commonalities
    expect(
      result.some(
        (item) =>
          item.toLowerCase().includes('transport') ||
          item.toLowerCase().includes('vehicle') ||
          item.toLowerCase().includes('mobility')
      )
    ).toBe(true);
  });

  it('handles items with few commonalities', async () => {
    const result = await commonalities(['apple', 'hammer', 'cloud']);
    expect(Array.isArray(result)).toBe(true);
    // May return empty array or very general commonalities like "physical objects"
  });

  it('returns empty array for single item', async () => {
    const result = await commonalities(['single-item']);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', async () => {
    const result = await commonalities([]);
    expect(result).toEqual([]);
  });
});

describe('commonalities examples', () => {
  it(
    'finds commonalities among devices',
    async () => {
      const result = await commonalities(['smartphone', 'laptop', 'tablet']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // LLM assertion to verify the commonalities contain meaningful results
      await aiExpect(result).toSatisfy(
        'Should contain meaningful commonalities between electronic devices like portability, computing capability, or digital interface',
        {
          context: 'Testing commonalities verblet with electronic devices',
        }
      );
    },
    longTestTimeout
  );

  it(
    'finds commonalities among animals',
    async () => {
      const result = await commonalities(['dog', 'cat', 'bird']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      await aiExpect(result).toSatisfy(
        'Should contain meaningful commonalities between animals like being pets, having sensory abilities, or biological characteristics',
        {
          context: 'Testing commonalities verblet with animals',
        }
      );
    },
    longTestTimeout
  );

  it(
    'handles abstract concepts',
    async () => {
      const result = await commonalities(['love', 'friendship', 'trust']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // LLM assertion for abstract concept commonalities - be more specific
      await aiExpect(result).toSatisfy(
        'Should contain meaningful commonalities between emotional/social concepts like human relationships, emotional bonds, or interpersonal connections',
        {
          context: 'Testing commonalities verblet with abstract concepts: love, friendship, trust',
        }
      );
    },
    longTestTimeout
  );
});
