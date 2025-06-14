import { describe, it } from 'vitest';
import setInterval from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('setInterval (example)', () => {
  it(
    'adjusts meditation sessions using wearable stress levels',
    async () => {
      const stop = setInterval({
        intervalPrompt:
          'Start at 3 min. If lastInvocationResult.stress > 70, shorten by 1 min; if below 30, lengthen by 2 min.',
        fn: () => {},
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
        intervalPrompt:
          'Begin at 10 sec. If lastInvocationResult.winRate > 80, decrease by 2 sec; if under 40, increase by 5 sec.',
        fn: () => {},
      });
      await new Promise((r) => setTimeout(r, 5000));
      stop();
    },
    longTestTimeout
  );
});
