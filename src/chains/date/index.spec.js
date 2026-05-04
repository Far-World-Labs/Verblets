import { beforeEach, vi, expect } from 'vitest';
import date, { mapRigor } from './index.js';
import bool from '../../verblets/bool/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../verblets/bool/index.js', () => ({ default: vi.fn() }));

const llm = (await import('../../lib/llm/index.js')).default;

beforeEach(() => vi.clearAllMocks());

// ─── mapRigor ────────────────────────────────────────────────────────────

runTable({
  describe: 'mapRigor',
  examples: [
    { name: 'low disables validation', inputs: { rigor: 'low', want: { validate: false } } },
    {
      name: 'high disables returnBestEffort',
      inputs: { rigor: 'high', want: { returnBestEffort: false } },
    },
  ],
  process: ({ rigor }) => mapRigor(rigor),
  expects: ({ result, inputs }) => expect(result).toMatchObject(inputs.want),
});

// ─── date — main behavior + retry integration (single vocabulary) ────────

runTable({
  describe: 'date chain',
  examples: [
    {
      name: 'returns a date when bool approves',
      inputs: {
        text: 'When is tomorrow?',
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('2023-01-02');
          bool.mockResolvedValueOnce(true);
        },
        wantIsoPrefix: '2023-01-02',
        wantLlmCalls: 2,
        wantBoolCalls: 1,
      },
    },
    {
      name: 'retries until bool approves',
      inputs: {
        text: 'When is tomorrow?',
        options: { maxAttempts: 2 },
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('2023-01-02');
          llm.mockResolvedValueOnce('2023-02-03');
          bool.mockResolvedValueOnce(false);
          bool.mockResolvedValueOnce(true);
        },
        wantIsoPrefix: '2023-02-03',
        wantLlmCalls: 3,
        wantBoolCalls: 2,
      },
    },
    {
      name: 'returns undefined when llm says undefined',
      inputs: {
        text: 'Unknown date',
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('undefined');
        },
        wantUndefined: true,
        wantLlmCalls: 2,
        wantNoBool: true,
      },
    },
    {
      name: 'skips expectations and validation with rigor low',
      inputs: {
        text: 'May 15 2023',
        options: { rigor: 'low' },
        mock: () => llm.mockResolvedValueOnce('2023-05-15'),
        wantIsoPrefix: '2023-05-15',
        wantLlmCalls: 1,
        wantNoBool: true,
      },
    },
    {
      name: 'returns undefined with rigor low when llm says undefined',
      inputs: {
        text: 'No date here',
        options: { rigor: 'low' },
        mock: () => llm.mockResolvedValueOnce('undefined'),
        wantUndefined: true,
        wantLlmCalls: 1,
        wantNoBool: true,
      },
    },
    {
      name: 'retries on transient LLM error during validation and succeeds (429)',
      inputs: {
        text: 'When was the event?',
        options: { retryDelay: 0 },
        mock: () => {
          llm.mockResolvedValueOnce(['Is it a valid date?']);
          llm.mockResolvedValueOnce('2023-06-15');
          const err = new Error('Rate limited');
          err.httpStatus = 429;
          bool.mockRejectedValueOnce(err);
          bool.mockResolvedValueOnce(true);
        },
        wantIsoPrefix: '2023-06-15',
        wantBoolCalls: 2,
      },
    },
    {
      name: 'retries on 500 server error during validation and succeeds',
      inputs: {
        text: 'March 20 2024',
        options: { retryDelay: 0 },
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('2024-03-20');
          const err = new Error('Internal Server Error');
          err.httpStatus = 500;
          bool.mockRejectedValueOnce(err);
          bool.mockResolvedValueOnce(true);
        },
        wantIsoPrefix: '2024-03-20',
      },
    },
    {
      name: 'returns best-effort date when retries are exhausted',
      inputs: {
        text: 'Some date',
        options: { maxAttempts: 2, retryDelay: 0 },
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('2023-01-01');
          bool.mockResolvedValueOnce(false);
          llm.mockResolvedValueOnce('2023-02-02');
          bool.mockResolvedValueOnce(false);
          llm.mockResolvedValueOnce('2023-03-03');
        },
        wantIsoPrefix: '2023-03-03',
        wantLlmCalls: 4,
        wantBoolCalls: 2,
      },
    },
    {
      name: 'returns undefined when retries exhausted with returnBestEffort false',
      inputs: {
        text: 'Some date',
        options: { maxAttempts: 2, returnBestEffort: false, retryDelay: 0 },
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('2023-01-01');
          bool.mockResolvedValueOnce(false);
          llm.mockResolvedValueOnce('2023-02-02');
          bool.mockResolvedValueOnce(false);
          llm.mockResolvedValueOnce('2023-03-03');
        },
        wantUndefined: true,
      },
    },
    {
      name: 'does not retry on auth failure',
      inputs: {
        text: 'Some date',
        options: { retryDelay: 0 },
        mock: () => {
          llm.mockResolvedValueOnce(['check']);
          llm.mockResolvedValueOnce('2023-01-01');
          const err = new Error('Unauthorized');
          err.httpStatus = 401;
          bool.mockRejectedValueOnce(err);
        },
        throws: 'Unauthorized',
        wantBoolCalls: 1,
      },
    },
  ],
  process: async ({ text, options, mock }) => {
    if (mock) mock();
    return date(text, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toBe(inputs.throws);
      if ('wantBoolCalls' in inputs) expect(bool).toHaveBeenCalledTimes(inputs.wantBoolCalls);
      return;
    }
    if (error) throw error;
    if (inputs.wantIsoPrefix) {
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().startsWith(inputs.wantIsoPrefix)).toBe(true);
    }
    if (inputs.wantUndefined) expect(result).toBeUndefined();
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantBoolCalls' in inputs) expect(bool).toHaveBeenCalledTimes(inputs.wantBoolCalls);
    if (inputs.wantNoBool) expect(bool).not.toHaveBeenCalled();
  },
});
