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
});
