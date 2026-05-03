import { beforeEach, vi, expect } from 'vitest';
import date, { mapRigor } from './index.js';
import bool from '../../verblets/bool/index.js';
import { runTable, partial } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../verblets/bool/index.js', () => ({ default: vi.fn() }));

const llm = (await import('../../lib/llm/index.js')).default;

beforeEach(() => vi.clearAllMocks());

// ─── mapRigor ─────────────────────────────────────────────────────────────

runTable({
  describe: 'mapRigor',
  examples: [
    {
      name: 'low disables validation',
      inputs: { rigor: 'low' },
      check: partial({ validate: false }),
    },
    {
      name: 'high disables returnBestEffort',
      inputs: { rigor: 'high' },
      check: partial({ returnBestEffort: false }),
    },
  ],
  process: ({ rigor }) => mapRigor(rigor),
});

// ─── date ─────────────────────────────────────────────────────────────────

const expectIso =
  (prefix) =>
  ({ result }) => {
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString().startsWith(prefix)).toBe(true);
  };

const dateExamples = [
  {
    name: 'returns a date when bool approves',
    inputs: {
      text: 'When is tomorrow?',
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('2023-01-02');
        bool.mockResolvedValueOnce(true);
      },
    },
    check: ({ result }) => {
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().startsWith('2023-01-02')).toBe(true);
      expect(llm).toHaveBeenCalledTimes(2);
      expect(bool).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'retries until bool approves',
    inputs: {
      text: 'When is tomorrow?',
      options: { maxAttempts: 2 },
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('2023-01-02');
        llm.mockResolvedValueOnce('2023-02-03');
        bool.mockResolvedValueOnce(false);
        bool.mockResolvedValueOnce(true);
      },
    },
    check: ({ result }) => {
      expect(result.toISOString().startsWith('2023-02-03')).toBe(true);
      expect(llm).toHaveBeenCalledTimes(3);
      expect(bool).toHaveBeenCalledTimes(2);
    },
  },
  {
    name: 'returns undefined when llm says undefined',
    inputs: {
      text: 'Unknown date',
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('undefined');
      },
    },
    check: ({ result }) => {
      expect(result).toBeUndefined();
      expect(llm).toHaveBeenCalledTimes(2);
      expect(bool).not.toHaveBeenCalled();
    },
  },
  {
    name: 'skips expectations and validation with rigor low',
    inputs: {
      text: 'May 15 2023',
      options: { rigor: 'low' },
      preMock: () => llm.mockResolvedValueOnce('2023-05-15'),
    },
    check: ({ result }) => {
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().startsWith('2023-05-15')).toBe(true);
      expect(llm).toHaveBeenCalledTimes(1);
      expect(bool).not.toHaveBeenCalled();
    },
  },
  {
    name: 'returns undefined with rigor low when llm says undefined',
    inputs: {
      text: 'No date here',
      options: { rigor: 'low' },
      preMock: () => llm.mockResolvedValueOnce('undefined'),
    },
    check: ({ result }) => {
      expect(result).toBeUndefined();
      expect(llm).toHaveBeenCalledTimes(1);
      expect(bool).not.toHaveBeenCalled();
    },
  },
];

runTable({
  describe: 'date chain',
  examples: dateExamples,
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return date(text, options);
  },
});

// ─── retry integration ────────────────────────────────────────────────────

const retryExamples = [
  {
    name: 'retries on transient LLM error during validation and succeeds (429)',
    inputs: {
      text: 'When was the event?',
      options: { retryDelay: 0 },
      preMock: () => {
        llm.mockResolvedValueOnce(['Is it a valid date?']);
        llm.mockResolvedValueOnce('2023-06-15');
        const err = new Error('Rate limited');
        err.httpStatus = 429;
        bool.mockRejectedValueOnce(err);
        bool.mockResolvedValueOnce(true);
      },
    },
    check: ({ result }) => {
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toMatch(/^2023-06-15/);
      expect(bool).toHaveBeenCalledTimes(2);
    },
  },
  {
    name: 'retries on 500 server error during validation and succeeds',
    inputs: {
      text: 'March 20 2024',
      options: { retryDelay: 0 },
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('2024-03-20');
        const err = new Error('Internal Server Error');
        err.httpStatus = 500;
        bool.mockRejectedValueOnce(err);
        bool.mockResolvedValueOnce(true);
      },
    },
    check: expectIso('2024-03-20'),
  },
  {
    name: 'returns best-effort date when retries are exhausted',
    inputs: {
      text: 'Some date',
      options: { maxAttempts: 2, retryDelay: 0 },
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('2023-01-01');
        bool.mockResolvedValueOnce(false);
        llm.mockResolvedValueOnce('2023-02-02');
        bool.mockResolvedValueOnce(false);
        llm.mockResolvedValueOnce('2023-03-03');
      },
    },
    check: ({ result }) => {
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toMatch(/^2023-03-03/);
      expect(llm).toHaveBeenCalledTimes(4);
      expect(bool).toHaveBeenCalledTimes(2);
    },
  },
  {
    name: 'returns undefined when retries exhausted with returnBestEffort false',
    inputs: {
      text: 'Some date',
      options: { maxAttempts: 2, returnBestEffort: false, retryDelay: 0 },
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('2023-01-01');
        bool.mockResolvedValueOnce(false);
        llm.mockResolvedValueOnce('2023-02-02');
        bool.mockResolvedValueOnce(false);
        llm.mockResolvedValueOnce('2023-03-03');
      },
    },
    check: ({ result }) => expect(result).toBeUndefined(),
  },
  {
    name: 'does not retry on auth failure',
    inputs: {
      text: 'Some date',
      options: { retryDelay: 0 },
      preMock: () => {
        llm.mockResolvedValueOnce(['check']);
        llm.mockResolvedValueOnce('2023-01-01');
        const err = new Error('Unauthorized');
        err.httpStatus = 401;
        bool.mockRejectedValueOnce(err);
      },
    },
    check: ({ error }) => {
      expect(error?.message).toBe('Unauthorized');
      expect(bool).toHaveBeenCalledTimes(1);
    },
  },
];

runTable({
  describe: 'date chain — retry integration',
  examples: retryExamples,
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return date(text, options);
  },
});
