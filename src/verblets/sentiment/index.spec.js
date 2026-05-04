import { vi, expect } from 'vitest';
import sentiment from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(async (prompt) => {
    if (/fantastic|amazing|wonderful/.test(prompt)) return 'positive';
    if (/worst|terrible|awful/.test(prompt)) return 'negative';
    return 'neutral';
  }),
}));

runTable({
  describe: 'sentiment',
  examples: [
    {
      name: 'classifies enthusiastic text as positive',
      inputs: { text: 'This is fantastic news!', want: 'positive' },
    },
    {
      name: 'classifies negative expressions as negative',
      inputs: { text: 'This is the worst day ever', want: 'negative' },
    },
    {
      name: 'classifies neutral statements as neutral',
      inputs: { text: 'The weather is okay today', want: 'neutral' },
    },
    { name: 'empty string → neutral', inputs: { text: '', want: 'neutral' } },
    { name: 'single positive word', inputs: { text: 'amazing', want: 'positive' } },
    // mixed sentiment is non-deterministic from the LLM perspective; assert
    // membership in the valid label set.
    {
      name: 'mixed sentiment text returns one of the valid labels',
      inputs: {
        text: 'The food was amazing but the service was terrible',
        wantOneOf: ['positive', 'negative', 'neutral'],
      },
    },
  ],
  process: ({ text }) => sentiment(text),
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantOneOf' in inputs) expect(inputs.wantOneOf).toContain(result);
  },
});
