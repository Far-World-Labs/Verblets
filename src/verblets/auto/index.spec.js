import { vi } from 'vitest';
import auto from './index.js';
import callLlm from '../../lib/llm/index.js';
import { runTable, partial } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text, config) => {
    if (config?.tools?.length) {
      return {
        name: 'testFunction',
        arguments: { query: text },
        result: { name: 'testFunction', arguments: JSON.stringify({ query: text }) },
      };
    }
    return 'no tools provided';
  }),
}));

const examples = [
  {
    name: 'returns tool call result when a function matches',
    inputs: { text: 'find restaurants nearby' },
    check: partial({
      noMatch: false,
      name: 'testFunction',
      arguments: { query: 'find restaurants nearby' },
      functionArgsAsArray: [{ query: 'find restaurants nearby' }],
    }),
  },
  {
    name: 'returns no-match indicator when LLM returns a string',
    inputs: {
      text: 'vague input',
      options: { defaultFunction: 'fallback', defaultArguments: { mode: 'safe' } },
      preMock: () => callLlm.mockImplementationOnce(() => 'I cannot determine the right function'),
    },
    check: partial({
      noMatch: true,
      name: 'fallback',
      arguments: { mode: 'safe' },
      reason: 'I cannot determine the right function',
    }),
  },
  {
    name: 'uses custom schemas when provided',
    inputs: {
      text: 'test input',
      options: {
        schemas: {
          customAction: {
            description: 'A custom action',
            properties: { item: { type: 'string' } },
            required: ['item'],
          },
        },
      },
    },
    // Custom check inspects what the LLM was called with rather than the
    // returned value — partial / equals don't fit, so write the assertion
    // inline.
    check: () => {
      const lastCall = callLlm.mock.calls[callLlm.mock.calls.length - 1];
      const tools = lastCall[1].tools;
      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe('customAction');
    },
  },
];

import { expect } from 'vitest';
runTable({
  describe: 'auto verblet',
  examples,
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return auto(text, options);
  },
});
