import { describe, it, expect } from 'vitest';
import setInterval from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('setInterval (example)', () => {
  it(
    'adjusts meditation sessions using wearable stress levels',
    async () => {
      const results = [];
      const stop = setInterval({
        prompt:
          'Current stress level: {stress}. Start at 3 min. If stress > 70, shorten by 1 min; if below 30, lengthen by 2 min.',
        getData: () => ({ stress: Math.floor(Math.random() * 100) }),
        onTick: ({ data }) => {
          results.push(data);
        },
      });

      // Wait longer to allow for LLM processing time
      await new Promise((r) => setTimeout(r, 10000));
      stop();

      // Assert that the function executed and collected stress data
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (result) =>
            typeof result.stress === 'number' && result.stress >= 0 && result.stress <= 100
        )
      ).toBe(true);
    },
    longTestTimeout
  );

  it(
    'paces game events to match player skill',
    async () => {
      const results = [];

      const stop = setInterval({
        prompt:
          'Player win rate: {winRate}%. Begin at 10 sec. If winRate > 80, decrease by 2 sec; if under 40, increase by 5 sec.',
        getData: () => ({ winRate: Math.floor(Math.random() * 100) }),
        onTick: ({ data }) => {
          results.push(data);
        },
      });

      // Wait longer to allow for LLM processing time
      await new Promise((r) => setTimeout(r, 10000));
      stop();

      // Assert that the function executed and collected win rate data
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (result) =>
            typeof result.winRate === 'number' && result.winRate >= 0 && result.winRate <= 100
        )
      ).toBe(true);
    },
    longTestTimeout
  );
});
