import { beforeEach, vi, expect } from 'vitest';
import date, { mapRigor } from './index.js';
import bool from '../../verblets/bool/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../verblets/bool/index.js', () => ({ default: vi.fn() }));

const llm = (await import('../../lib/llm/index.js')).default;

beforeEach(() => vi.clearAllMocks());

const make429 = () => {
  const err = new Error('Rate limited');
  err.httpStatus = 429;
  return err;
};
const make500 = () => {
  const err = new Error('Internal Server Error');
  err.httpStatus = 500;
  return err;
};
const make401 = () => {
  const err = new Error('Unauthorized');
  err.httpStatus = 401;
  return err;
};

runTable({
  describe: 'mapRigor',
  examples: [
    {
      name: 'low disables validation',
      inputs: { rigor: 'low' },
      want: { value: { validate: false } },
    },
    {
      name: 'high disables returnBestEffort',
      inputs: { rigor: 'high' },
      want: { value: { returnBestEffort: false } },
    },
  ],
  process: ({ inputs }) => mapRigor(inputs.rigor),
  expects: ({ result, want }) => expect(result).toMatchObject(want.value),
});

runTable({
  describe: 'date chain',
  examples: [
    {
      name: 'returns a date when bool approves',
      inputs: { text: 'When is tomorrow?' },
      mocks: { llm: [['check'], '2023-01-02'], bool: [true] },
      want: { isoPrefix: '2023-01-02', llmCalls: 2, boolCalls: 1 },
    },
    {
      name: 'retries until bool approves',
      inputs: { text: 'When is tomorrow?', options: { maxAttempts: 2 } },
      mocks: {
        llm: [['check'], '2023-01-02', '2023-02-03'],
        bool: [false, true],
      },
      want: { isoPrefix: '2023-02-03', llmCalls: 3, boolCalls: 2 },
    },
    {
      name: 'returns undefined when llm says undefined',
      inputs: { text: 'Unknown date' },
      mocks: { llm: [['check'], 'undefined'] },
      want: { undefined: true, llmCalls: 2, noBool: true },
    },
    {
      name: 'skips expectations and validation with rigor low',
      inputs: { text: 'May 15 2023', options: { rigor: 'low' } },
      mocks: { llm: ['2023-05-15'] },
      want: { isoPrefix: '2023-05-15', llmCalls: 1, noBool: true },
    },
    {
      name: 'returns undefined with rigor low when llm says undefined',
      inputs: { text: 'No date here', options: { rigor: 'low' } },
      mocks: { llm: ['undefined'] },
      want: { undefined: true, llmCalls: 1, noBool: true },
    },
    {
      name: 'retries on transient LLM error during validation and succeeds (429)',
      inputs: { text: 'When was the event?', options: { retryDelay: 0 } },
      mocks: {
        llm: [['Is it a valid date?'], '2023-06-15'],
        bool: [make429(), true],
      },
      want: { isoPrefix: '2023-06-15', boolCalls: 2 },
    },
    {
      name: 'retries on 500 server error during validation and succeeds',
      inputs: { text: 'March 20 2024', options: { retryDelay: 0 } },
      mocks: {
        llm: [['check'], '2024-03-20'],
        bool: [make500(), true],
      },
      want: { isoPrefix: '2024-03-20' },
    },
    {
      name: 'returns best-effort date when retries are exhausted',
      inputs: { text: 'Some date', options: { maxAttempts: 2, retryDelay: 0 } },
      mocks: {
        llm: [['check'], '2023-01-01', '2023-02-02', '2023-03-03'],
        bool: [false, false],
      },
      want: { isoPrefix: '2023-03-03', llmCalls: 4, boolCalls: 2 },
    },
    {
      name: 'returns undefined when retries exhausted with returnBestEffort false',
      inputs: {
        text: 'Some date',
        options: { maxAttempts: 2, returnBestEffort: false, retryDelay: 0 },
      },
      mocks: {
        llm: [['check'], '2023-01-01', '2023-02-02', '2023-03-03'],
        bool: [false, false],
      },
      want: { undefined: true },
    },
    {
      name: 'does not retry on auth failure',
      inputs: { text: 'Some date', options: { retryDelay: 0 } },
      mocks: {
        llm: [['check'], '2023-01-01'],
        bool: [make401()],
      },
      want: { throws: 'Unauthorized', boolCalls: 1 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm, bool });
    return date(inputs.text, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toBe(want.throws);
      if ('boolCalls' in want) expect(bool).toHaveBeenCalledTimes(want.boolCalls);
      return;
    }
    if (error) throw error;
    if (want.isoPrefix) {
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().startsWith(want.isoPrefix)).toBe(true);
    }
    if (want.undefined) expect(result).toBeUndefined();
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if ('boolCalls' in want) expect(bool).toHaveBeenCalledTimes(want.boolCalls);
    if (want.noBool) expect(bool).not.toHaveBeenCalled();
  },
});
