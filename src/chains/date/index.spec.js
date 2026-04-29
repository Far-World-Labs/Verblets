import { beforeEach, describe, expect, it, vi } from 'vitest';
import date, { mapRigor } from './index.js';
import bool from '../../verblets/bool/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../verblets/bool/index.js', () => ({
  default: vi.fn(),
}));

const llm = (await import('../../lib/llm/index.js')).default;

describe('mapRigor', () => {
  it('low disables validation', () => {
    const result = mapRigor('low');
    expect(result.validate).toBe(false);
  });

  it('high disables returnBestEffort', () => {
    const result = mapRigor('high');
    expect(result.returnBestEffort).toBe(false);
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

  describe('retry integration', () => {
    it('retries on transient LLM error during validation and succeeds', async () => {
      llm.mockResolvedValueOnce(['Is it a valid date?']);
      llm.mockResolvedValueOnce('2023-06-15');
      const transientError = new Error('Rate limited');
      transientError.httpStatus = 429;
      bool.mockRejectedValueOnce(transientError);
      bool.mockResolvedValueOnce(true);

      const result = await date('When was the event?', { retryDelay: 0 });

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toMatch(/^2023-06-15/);
      expect(bool).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 server error during validation and succeeds', async () => {
      llm.mockResolvedValueOnce(['check']);
      llm.mockResolvedValueOnce('2024-03-20');
      const serverError = new Error('Internal Server Error');
      serverError.httpStatus = 500;
      bool.mockRejectedValueOnce(serverError);
      bool.mockResolvedValueOnce(true);

      const result = await date('March 20 2024', { retryDelay: 0 });

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toMatch(/^2024-03-20/);
      expect(bool).toHaveBeenCalledTimes(2);
    });

    it('returns best-effort date when retries are exhausted', async () => {
      llm.mockResolvedValueOnce(['check']);
      llm.mockResolvedValueOnce('2023-01-01');
      bool.mockResolvedValueOnce(false);
      llm.mockResolvedValueOnce('2023-02-02');
      bool.mockResolvedValueOnce(false);
      llm.mockResolvedValueOnce('2023-03-03');

      const result = await date('Some date', { maxAttempts: 2, retryDelay: 0 });

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toMatch(/^2023-03-03/);
      expect(llm).toHaveBeenCalledTimes(4);
      expect(bool).toHaveBeenCalledTimes(2);
    });

    it('returns undefined when retries exhausted with returnBestEffort false', async () => {
      llm.mockResolvedValueOnce(['check']);
      llm.mockResolvedValueOnce('2023-01-01');
      bool.mockResolvedValueOnce(false);
      llm.mockResolvedValueOnce('2023-02-02');
      bool.mockResolvedValueOnce(false);
      llm.mockResolvedValueOnce('2023-03-03');

      const result = await date('Some date', {
        maxAttempts: 2,
        returnBestEffort: false,
        retryDelay: 0,
      });

      expect(result).toBeUndefined();
    });

    it('does not retry on auth failure', async () => {
      llm.mockResolvedValueOnce(['check']);
      llm.mockResolvedValueOnce('2023-01-01');
      const authError = new Error('Unauthorized');
      authError.httpStatus = 401;
      bool.mockRejectedValueOnce(authError);

      await expect(date('Some date', { retryDelay: 0 })).rejects.toThrow('Unauthorized');
      expect(bool).toHaveBeenCalledTimes(1);
    });
  });
});
