import { vi, expect } from 'vitest';
import auto from './index.js';
import callLlm from '../../lib/llm/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── result-shape assertions ──────────────────────────────────────────────

runTable({
  describe: 'auto verblet — result shape',
  examples: [
    {
      name: 'returns tool call result when a function matches',
      inputs: {
        text: 'find restaurants nearby',
        want: {
          noMatch: false,
          name: 'testFunction',
          arguments: { query: 'find restaurants nearby' },
          functionArgsAsArray: [{ query: 'find restaurants nearby' }],
        },
      },
    },
    {
      name: 'returns no-match indicator when LLM returns a string',
      inputs: {
        text: 'vague input',
        options: { defaultFunction: 'fallback', defaultArguments: { mode: 'safe' } },
        preMock: () =>
          callLlm.mockImplementationOnce(() => 'I cannot determine the right function'),
        want: {
          noMatch: true,
          name: 'fallback',
          arguments: { mode: 'safe' },
          reason: 'I cannot determine the right function',
        },
      },
    },
  ],
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return auto(text, options);
  },
  expects: ({ result, inputs }) => expect(result).toMatchObject(inputs.want),
});

// ─── LLM call inspection (different vocabulary, separate block) ───────────

runTable({
  describe: 'auto verblet — schema forwarding',
  examples: [
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
        wantTools: [{ name: 'customAction' }],
      },
    },
  ],
  process: async ({ text, options }) => auto(text, options),
  expects: ({ inputs }) => {
    const lastCall = callLlm.mock.calls[callLlm.mock.calls.length - 1];
    const tools = lastCall[1].tools;
    expect(tools).toHaveLength(inputs.wantTools.length);
    for (let i = 0; i < inputs.wantTools.length; i++) {
      expect(tools[i].function.name).toBe(inputs.wantTools[i].name);
    }
  },
});
