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

    const getData = vi.fn().mockResolvedValue('test data');
    const stop = setInterval({ prompt: 'prompt', getData });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(getData).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(getData).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(getData).toHaveBeenCalledTimes(3);
    stop();
    await vi.runOnlyPendingTimersAsync();
  });

  it('interpolates variables from getData results in prompt', async () => {
    chatGPT.mockResolvedValueOnce('1 second');
    numberWithUnits.mockResolvedValueOnce({ value: 1, unit: 'second' });
    date.mockResolvedValue(undefined);
    number.mockResolvedValue(undefined);

    const getData = vi.fn().mockResolvedValue({ stress: 85, mood: 'anxious' });
    const stop = setInterval({
      prompt: 'Current stress: {stress}, mood: {mood}. Wait time?',
      getData,
    });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    // Check that chatGPT was called with interpolated values
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Current stress: 85, mood: anxious. Wait time?'),
      expect.any(Object)
    );

    stop();
    await vi.runOnlyPendingTimersAsync();
  });

  it('prevents new timers after stop is called', async () => {
    chatGPT.mockResolvedValueOnce('1 second');
    numberWithUnits.mockResolvedValueOnce({ value: 1, unit: 'second' });
    date.mockResolvedValue(undefined);
    number.mockResolvedValue(undefined);

    const getData = vi.fn().mockResolvedValue('test data');
    const stop = setInterval({ prompt: 'prompt', getData });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(getData).toHaveBeenCalledTimes(1);

    // Stop before the next timer would be set
    stop();

    // Advance time and verify no more calls happen
    await vi.advanceTimersByTimeAsync(1000);
    expect(getData).toHaveBeenCalledTimes(1); // Should still be 1

    await vi.runOnlyPendingTimersAsync();
  });
});
