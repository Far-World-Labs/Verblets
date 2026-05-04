import { beforeEach, vi, expect } from 'vitest';
import join from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({ default: vi.fn() }));

import llm from '../../lib/llm/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  llm.mockImplementation((prompt) => {
    if (prompt.includes('Hello') && prompt.includes('world') && prompt.includes('today')) {
      return 'Hello and world and today';
    }
    if (prompt.includes('a') && prompt.includes('b') && prompt.includes('c')) {
      return 'a and b and c';
    }
    if (prompt.includes('SECTION A') || prompt.includes('Stitch')) {
      return 'Hello and world and today';
    }
    return 'joined result';
  });
});

runTable({
  describe: 'join chain',
  examples: [
    {
      name: 'joins fragments via LLM with transitions',
      inputs: { items: ['Hello', 'world', 'today'], instructions: 'Connect with simple words' },
      want: { contains: ['Hello', 'world', 'today'], llmCalled: true },
    },
    {
      name: 'applies windowed processing when configured',
      inputs: {
        items: ['a', 'b', 'c'],
        instructions: 'Simple connections',
        options: { windowSize: 2 },
      },
      want: { nonEmpty: true, llmCalled: true },
    },
    {
      name: 'returns empty string for empty array',
      inputs: { items: [] },
      want: { value: '', noLlm: true },
    },
    {
      name: 'returns raw item for single-element array',
      inputs: { items: ['only'] },
      want: { value: 'only', noLlm: true },
    },
  ],
  process: ({ inputs }) => join(inputs.items, inputs.instructions, inputs.options),
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toBe(want.value);
    if (want.contains) {
      for (const fragment of want.contains) expect(result).toContain(fragment);
    }
    if (want.nonEmpty) expect(result.length).toBeGreaterThan(0);
    if (want.llmCalled) expect(llm).toHaveBeenCalled();
    if (want.noLlm) expect(llm).not.toHaveBeenCalled();
  },
});
