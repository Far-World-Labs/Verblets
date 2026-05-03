import { vi } from 'vitest';
import sentiment from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(async (prompt) => {
    if (/fantastic|amazing|wonderful/.test(prompt)) return 'positive';
    if (/worst|terrible|awful/.test(prompt)) return 'negative';
    return 'neutral';
  }),
}));

const examples = [
  {
    name: 'classifies enthusiastic text as positive',
    inputs: 'This is fantastic news!',
    check: equals('positive'),
  },
  {
    name: 'classifies negative expressions as negative',
    inputs: 'This is the worst day ever',
    check: equals('negative'),
  },
  {
    name: 'classifies neutral statements as neutral',
    inputs: 'The weather is okay today',
    check: equals('neutral'),
  },
  { name: 'empty string → neutral', inputs: '', check: equals('neutral') },
  { name: 'single positive word', inputs: 'amazing', check: equals('positive') },
  // mixed sentiment is non-deterministic from the LLM perspective; assert
  // membership in the valid label set.
  {
    name: 'mixed sentiment text returns one of the valid labels',
    inputs: 'The food was amazing but the service was terrible',
    check: ({ result }) => {
      expect(['positive', 'negative', 'neutral']).toContain(result);
    },
  },
];

import { expect } from 'vitest';
runTable({ describe: 'sentiment', examples, process: (text) => sentiment(text) });
