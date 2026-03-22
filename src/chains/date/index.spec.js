import { beforeEach, describe, expect, it, vi } from 'vitest';
import date from './index.js';
import bool from '../../verblets/bool/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../verblets/bool/index.js', () => ({
  default: vi.fn(),
}));

const llm = (await import('../../lib/llm/index.js')).default;

describe('date chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns a date when bool approves', async () => {
    llm.mockResolvedValueOnce(['check']);
    llm.mockResolvedValueOnce('2023-01-02');
    bool.mockResolvedValueOnce(true);
    const result = await date('When is tomorrow?');
    expect(result instanceof Date).toBe(true);
    expect(result.toISOString().startsWith('2023-01-02')).toBe(true);
    expect(llm).toHaveBeenCalledTimes(2);
    expect(bool).toHaveBeenCalledTimes(1);
  });

  it('retries until bool approves', async () => {
    llm.mockResolvedValueOnce(['check']);
    llm.mockResolvedValueOnce('2023-01-02');
    llm.mockResolvedValueOnce('2023-02-03');
    bool.mockResolvedValueOnce(false);
    bool.mockResolvedValueOnce(true);

    const result = await date('When is tomorrow?', { maxAttempts: 2 });
    expect(result.toISOString().startsWith('2023-02-03')).toBe(true);
    expect(llm).toHaveBeenCalledTimes(3);
    expect(bool).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when llm says undefined', async () => {
    llm.mockResolvedValueOnce(['check']);
    llm.mockResolvedValueOnce('undefined');
    const result = await date('Unknown date');
    expect(result).toBeUndefined();
    expect(llm).toHaveBeenCalledTimes(2);
    expect(bool).not.toHaveBeenCalled();
  });
});
