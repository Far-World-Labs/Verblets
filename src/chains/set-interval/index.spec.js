import { describe, expect, it, vi } from 'vitest';
import setInterval from './index.js';

vi.useFakeTimers();

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

describe('setInterval', () => {
  it('runs callback with dynamic delays', async () => {
    chatGPT.mockResolvedValueOnce('1 second').mockResolvedValueOnce('2 seconds');
    numberWithUnits
      .mockResolvedValueOnce({ value: 1, unit: 'second' })
      .mockResolvedValueOnce({ value: 2, unit: 'second' });
    date.mockResolvedValue(undefined);
    number.mockResolvedValue(undefined);

    const cb = vi.fn();
    const stop = setInterval({ intervalPrompt: 'prompt', fn: cb });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(cb).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(cb).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(cb).toHaveBeenCalledTimes(3);
    stop();
    await vi.runOnlyPendingTimersAsync();
  });
});
