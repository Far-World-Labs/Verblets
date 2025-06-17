import { describe, it } from 'vitest';
import setInterval from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('setInterval (example)', () => {
  it(
    'adjusts meditation sessions using wearable stress levels',
    async () => {
      const stop = setInterval({
        prompt:
          'Current stress level: {stress}. Start at 3 min. If stress > 70, shorten by 1 min; if below 30, lengthen by 2 min.',
        getData: () => ({ stress: Math.floor(Math.random() * 100) }),
        onTick: ({ data }) => console.log(`Meditation session with stress level: ${data.stress}`),
      });
      await new Promise((r) => setTimeout(r, 5000));
      stop();
    },
    longTestTimeout
  );

  it(
    'paces game events to match player skill',
    async () => {
      const stop = setInterval({
        prompt:
          'Player win rate: {winRate}%. Begin at 10 sec. If winRate > 80, decrease by 2 sec; if under 40, increase by 5 sec.',
        getData: () => ({ winRate: Math.floor(Math.random() * 100) }),
        onTick: ({ data }) =>
          console.log(`Game event triggered for player with ${data.winRate}% win rate`),
      });
      await new Promise((r) => setTimeout(r, 5000));
      stop();
    },
    longTestTimeout
  );
});
