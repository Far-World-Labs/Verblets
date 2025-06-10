import { describe, it, expect, vi } from 'vitest';
import createLogger from './index.js';

describe('logger chain', () => {
  it('flushes after batch size reached', async () => {
    const base = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = createLogger({ batchSize: 10, flushInterval: 5000, baseLogger: base });
    logger.info('a');
    logger.info('b');
    await logger.flush();
    expect(base.info).toHaveBeenCalledTimes(2);
  });

  it('flushes after timeout', async () => {
    vi.useFakeTimers();
    const base = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = createLogger({ batchSize: 10, flushInterval: 1000, baseLogger: base });
    logger.info('a');
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    expect(base.info).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
