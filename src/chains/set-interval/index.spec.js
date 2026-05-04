import { vi } from 'vitest';
import setInterval from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.useFakeTimers();

vi.mock('../../lib/llm/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: vi.fn() };
});
vi.mock('../date/index.js', () => ({ default: vi.fn() }));
vi.mock('../../verblets/number-with-units/index.js', () => ({ default: vi.fn() }));
vi.mock('../../verblets/number/index.js', () => ({ default: vi.fn() }));

const llm = (await import('../../lib/llm/index.js')).default;
const date = (await import('../date/index.js')).default;
const numberWithUnits = (await import('../../verblets/number-with-units/index.js')).default;
const number = (await import('../../verblets/number/index.js')).default;

// Each row's `run` IS the test logic — assertions live inside `run` because
// fake-timer interleaving can't be expressed declaratively. The processor
// runs the row's run() and the table-level expects is a no-op (the run
// function itself enforces correctness via expect()).
runTable({
  describe: 'setInterval',
  examples: [
    {
      name: 'runs callback with dynamic delays',
      inputs: {
        prompt: 'prompt',
        mock: () => {
          llm.mockResolvedValueOnce('1 second').mockResolvedValueOnce('2 seconds');
          numberWithUnits
            .mockResolvedValueOnce({ value: 1, unit: 'second' })
            .mockResolvedValueOnce({ value: 2, unit: 'second' });
          date.mockResolvedValue(undefined);
          number.mockResolvedValue(undefined);
        },
        run: async ({ getData, stop, expect }) => {
          await Promise.resolve();
          await vi.advanceTimersByTimeAsync(0);
          expect(getData).toHaveBeenCalledTimes(1);
          await vi.advanceTimersByTimeAsync(1000);
          expect(getData).toHaveBeenCalledTimes(2);
          await vi.advanceTimersByTimeAsync(2000);
          expect(getData).toHaveBeenCalledTimes(3);
          stop();
          await vi.runOnlyPendingTimersAsync();
        },
      },
    },
    {
      name: 'interpolates variables from getData results in prompt',
      inputs: {
        prompt: 'Current stress: {stress}, mood: {mood}. Wait time?',
        getData: () => ({ stress: 85, mood: 'anxious' }),
        mock: () => {
          llm.mockResolvedValueOnce('1 second');
          numberWithUnits.mockResolvedValueOnce({ value: 1, unit: 'second' });
          date.mockResolvedValue(undefined);
          number.mockResolvedValue(undefined);
        },
        run: async ({ stop, expect }) => {
          await Promise.resolve();
          await vi.advanceTimersByTimeAsync(0);
          expect(llm).toHaveBeenCalledWith(
            expect.stringContaining('Current stress: 85, mood: anxious. Wait time?'),
            expect.any(Object)
          );
          stop();
          await vi.runOnlyPendingTimersAsync();
        },
      },
    },
    {
      name: 'prevents new timers after stop is called',
      inputs: {
        prompt: 'prompt',
        mock: () => {
          llm.mockResolvedValueOnce('1 second');
          numberWithUnits.mockResolvedValueOnce({ value: 1, unit: 'second' });
          date.mockResolvedValue(undefined);
          number.mockResolvedValue(undefined);
        },
        run: async ({ getData, stop, expect }) => {
          await Promise.resolve();
          await vi.advanceTimersByTimeAsync(0);
          expect(getData).toHaveBeenCalledTimes(1);
          stop();
          await vi.advanceTimersByTimeAsync(1000);
          expect(getData).toHaveBeenCalledTimes(1);
          await vi.runOnlyPendingTimersAsync();
        },
      },
    },
  ],
  process: async ({ prompt, getData: dataValue, mock, run }) => {
    if (mock) mock();
    const getData = vi.fn().mockResolvedValue(dataValue ?? 'test data');
    const stop = setInterval({ prompt, getData });
    const { expect } = await import('vitest');
    await run({ getData, stop, expect });
  },
  expects: () => {
    // Per-row run() handles all assertions inline — fake-timer interleaving
    // doesn't reduce to a single assertion vocabulary.
  },
});
