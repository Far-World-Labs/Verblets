import { beforeEach, describe, expect, it, vi } from 'vitest';
import date, { mapRigor } from './index.js';
import bool from '../../verblets/bool/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../verblets/bool/index.js', () => ({
  default: vi.fn(),
}));

const llm = (await import('../../lib/llm/index.js')).default;

describe('mapRigor', () => {
  it('returns default (validate + 3 attempts + best-effort) when undefined', () => {
    expect(mapRigor(undefined)).toEqual({ validate: true, maxAttempts: 3, returnBestEffort: true });
  });

  it('maps low to extraction-only — no validation, single attempt', () => {
    expect(mapRigor('low')).toEqual({ validate: false, maxAttempts: 1, returnBestEffort: true });
  });

  it('maps high to strict — more attempts, no best-effort fallback', () => {
    expect(mapRigor('high')).toEqual({ validate: true, maxAttempts: 5, returnBestEffort: false });
  });

  it('passes through object for power consumers', () => {
    const custom = { validate: true, maxAttempts: 10, returnBestEffort: false };
    expect(mapRigor(custom)).toBe(custom);
  });

  it('falls back to default on unknown string', () => {
    expect(mapRigor('extreme')).toEqual({ validate: true, maxAttempts: 3, returnBestEffort: true });
  });
});

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

  it('skips expectations and validation with rigor low', async () => {
    llm.mockResolvedValueOnce('2023-05-15');

    const result = await date('May 15 2023', { rigor: 'low' });

    expect(result instanceof Date).toBe(true);
    expect(result.toISOString().startsWith('2023-05-15')).toBe(true);
    // Only 1 LLM call (extraction), no expectations call, no bool validation
    expect(llm).toHaveBeenCalledTimes(1);
    expect(bool).not.toHaveBeenCalled();
  });

  it('returns undefined with rigor low when llm says undefined', async () => {
    llm.mockResolvedValueOnce('undefined');

    const result = await date('No date here', { rigor: 'low' });

    expect(result).toBeUndefined();
    expect(llm).toHaveBeenCalledTimes(1);
    expect(bool).not.toHaveBeenCalled();
  });
});
