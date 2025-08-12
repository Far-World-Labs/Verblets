import { describe, it as vitestIt, expect as vitestExpect, vi, afterAll } from 'vitest';
import setInterval from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Set interval chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Set interval chain' } })
  : vitestExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Set interval chain', extractFileContext(2));
});

// Use synthetic timers for fast testing
vi.useFakeTimers();

// Mock the dependencies like in the spec file
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../date/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../verblets/number-with-units/index.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../verblets/number/index.js', () => ({
  default: vi.fn(),
}));

const chatGPT = (await import('../../lib/chatgpt/index.js')).default;
const date = (await import('../date/index.js')).default;
const numberWithUnits = (await import('../../verblets/number-with-units/index.js')).default;
const number = (await import('../../verblets/number/index.js')).default;

describe('setInterval (example)', () => {
  it(
    'adjusts meditation sessions using wearable stress levels',
    async () => {
      // Mock the LLM responses for timing decisions
      chatGPT
        .mockResolvedValueOnce('3 minutes')
        .mockResolvedValueOnce('2 minutes')
        .mockResolvedValueOnce('4 minutes');

      // Mock the time parsing
      numberWithUnits
        .mockResolvedValueOnce({ value: 3, unit: 'minutes' })
        .mockResolvedValueOnce({ value: 2, unit: 'minutes' })
        .mockResolvedValueOnce({ value: 4, unit: 'minutes' });

      date.mockResolvedValue(undefined);
      number.mockResolvedValue(undefined);

      const results = [];
      const stop = setInterval({
        prompt:
          'Current stress level: {stress}. Start at 3 min. If stress > 70, shorten by 1 min; if below 30, lengthen by 2 min.',
        getData: () => ({ stress: Math.floor(Math.random() * 100) }),
        onTick: ({ data }) => {
          results.push(data);
        },
      });

      // Use synthetic timer advancement instead of real setTimeout
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0); // First tick
      await vi.advanceTimersByTimeAsync(180000); // 3 minutes
      await vi.advanceTimersByTimeAsync(120000); // 2 minutes

      stop();
      await vi.runOnlyPendingTimersAsync();

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
      // Mock the LLM responses for timing decisions
      chatGPT
        .mockResolvedValueOnce('10 seconds')
        .mockResolvedValueOnce('8 seconds')
        .mockResolvedValueOnce('15 seconds');

      // Mock the time parsing
      numberWithUnits
        .mockResolvedValueOnce({ value: 10, unit: 'seconds' })
        .mockResolvedValueOnce({ value: 8, unit: 'seconds' })
        .mockResolvedValueOnce({ value: 15, unit: 'seconds' });

      date.mockResolvedValue(undefined);
      number.mockResolvedValue(undefined);

      const results = [];

      const stop = setInterval({
        prompt:
          'Player win rate: {winRate}%. Begin at 10 sec. If winRate > 80, decrease by 2 sec; if under 40, increase by 5 sec.',
        getData: () => ({ winRate: Math.floor(Math.random() * 100) }),
        onTick: ({ data }) => {
          results.push(data);
        },
      });

      // Use synthetic timer advancement instead of real setTimeout
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0); // First tick
      await vi.advanceTimersByTimeAsync(10000); // 10 seconds
      await vi.advanceTimersByTimeAsync(8000); // 8 seconds

      stop();
      await vi.runOnlyPendingTimersAsync();

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
