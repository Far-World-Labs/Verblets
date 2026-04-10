import { describe, expect, it, vi } from 'vitest';

import auto from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text, config) => {
    // When tools are provided, simulate a tool call response
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

describe('Auto verblet', () => {
  it('returns tool call result when a function matches', async () => {
    const result = await auto('find restaurants nearby');

    expect(result.noMatch).toBe(false);
    expect(result.name).toBe('testFunction');
    expect(result.arguments).toEqual({ query: 'find restaurants nearby' });
    expect(result.functionArgsAsArray).toEqual([{ query: 'find restaurants nearby' }]);
  });

  it('returns no-match indicator when LLM returns a string', async () => {
    const callLlm = (await import('../../lib/llm/index.js')).default;
    callLlm.mockImplementationOnce(() => 'I cannot determine the right function');

    const result = await auto('vague input', {
      defaultFunction: 'fallback',
      defaultArguments: { mode: 'safe' },
    });

    expect(result.noMatch).toBe(true);
    expect(result.name).toBe('fallback');
    expect(result.arguments).toEqual({ mode: 'safe' });
    expect(result.reason).toBe('I cannot determine the right function');
  });

  it('uses custom schemas when provided', async () => {
    const callLlm = (await import('../../lib/llm/index.js')).default;

    await auto('test input', {
      schemas: {
        customAction: {
          description: 'A custom action',
          properties: { item: { type: 'string' } },
          required: ['item'],
        },
      },
    });

    const lastCall = callLlm.mock.calls[callLlm.mock.calls.length - 1];
    const tools = lastCall[1].tools;
    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('customAction');
  });
});
