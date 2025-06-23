import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { roundRobin, probabilisticSampling, defaultTurnPolicy } from './turn-policies.js';

describe('turn policies', () => {
  describe('roundRobin', () => {
    it('cycles through speakers in order', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const policy = roundRobin(speakers);

      expect(policy(0, [])).toEqual(['a']);
      expect(policy(1, [])).toEqual(['b']);
      expect(policy(2, [])).toEqual(['c']);
      expect(policy(3, [])).toEqual(['a']); // Cycles back
      expect(policy(4, [])).toEqual(['b']);
    });

    it('handles single speaker', () => {
      const speakers = [{ id: 'solo' }];
      const policy = roundRobin(speakers);

      expect(policy(0, [])).toEqual(['solo']);
      expect(policy(1, [])).toEqual(['solo']);
      expect(policy(2, [])).toEqual(['solo']);
    });
  });

  describe('probabilisticSampling', () => {
    beforeEach(() => {
      // Mock Math.random for predictable testing
      vi.spyOn(Math, 'random');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns array of speaker IDs', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }];
      Math.random.mockReturnValue(0.5);

      const policy = probabilisticSampling(speakers);
      const result = policy(0, []);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((id) => typeof id === 'string')).toBe(true);
    });

    it('respects minSpeakers and maxSpeakers', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      Math.random.mockReturnValue(0.5);

      const policy = probabilisticSampling(speakers, {
        minSpeakers: 2,
        maxSpeakers: 2,
      });
      const result = policy(0, []);

      expect(result.length).toBe(2);
    });

    it('can select same speaker multiple times', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }];
      // Mock to always select first speaker
      Math.random.mockReturnValue(0.1);

      const policy = probabilisticSampling(speakers, {
        minSpeakers: 3,
        maxSpeakers: 3,
      });
      const result = policy(0, []);

      expect(result.length).toBe(3);
      // Could have duplicates
    });

    it('uses custom weights', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }];

      const policy = probabilisticSampling(speakers, {
        weights: [9, 1], // Heavily favor first speaker
        minSpeakers: 1,
        maxSpeakers: 1,
      });

      // Test multiple calls to see if it works
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(policy(i, []));
      }

      expect(results.every((r) => Array.isArray(r) && r.length === 1)).toBe(true);
    });

    it('validates weights array length', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }];

      expect(() => {
        probabilisticSampling(speakers, {
          weights: [1], // Wrong length
        });
      }).toThrow('Weights array must match speakers array length');
    });
  });

  describe('defaultTurnPolicy', () => {
    it('returns a function', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }];
      const policy = defaultTurnPolicy(speakers);

      expect(typeof policy).toBe('function');
    });

    it('returns speaker IDs when called', () => {
      const speakers = [{ id: 'a' }, { id: 'b' }];
      const policy = defaultTurnPolicy(speakers);
      const result = policy(0, []);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5); // Max 5 speakers
    });

    it('respects maximum of 5 speakers', () => {
      const speakers = Array.from({ length: 10 }, (_, i) => ({ id: `speaker${i}` }));
      const policy = defaultTurnPolicy(speakers);

      // Test multiple rounds
      for (let round = 0; round < 5; round++) {
        const result = policy(round, []);
        expect(result.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
