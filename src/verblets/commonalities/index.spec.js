import { vi, beforeEach, expect } from 'vitest';
import commonalities from './index.js';
import mockLlm from '../../lib/llm/index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => mockLlm.mockReset());

// Processor returns { result, prompt } so the same expects can target both.
runTable({
  describe: 'commonalities',
  examples: [
    { name: 'empty input → empty array', inputs: { items: [] }, want: { value: [] } },
    {
      name: 'single item → empty array',
      inputs: { items: ['item1'] },
      want: { value: [] },
    },
    {
      name: 'finds common threads between items',
      inputs: { items: ['smartphone', 'laptop', 'tablet'] },
      mocks: { llm: [{ items: ['Portable electronics', 'Computing devices'] }] },
      want: { value: ['Portable electronics', 'Computing devices'] },
    },
    {
      name: 'parses items array from LLM response',
      inputs: { items: ['car', 'bicycle', 'motorcycle'] },
      mocks: { llm: [{ items: ['Transportation', 'Wheeled vehicles'] }] },
      want: { value: ['Transportation', 'Wheeled vehicles'] },
    },
    {
      name: 'no commonalities → empty array',
      inputs: { items: ['apple', 'car'] },
      mocks: { llm: [{ items: [] }] },
      want: { value: [] },
    },
    {
      name: 'unexpected LLM response handled gracefully',
      inputs: { items: ['item1', 'item2'] },
      mocks: { llm: [undefined] },
      want: { value: [] },
    },
    {
      name: 'positional instructions reach the prompt',
      inputs: {
        items: ['bus', 'subway', 'taxi'],
        instructions: 'focus on public transportation in cities',
      },
      mocks: { llm: [{ items: ['Urban transport'] }] },
      want: {
        value: ['Urban transport'],
        promptContains: ['focus on public transportation in cities'],
      },
    },
    {
      name: 'instruction-bundle context wires into the prompt',
      inputs: {
        items: ['bus', 'subway'],
        instructions: { text: 'focus on transit', region: 'Southeast Asia' },
      },
      mocks: { llm: [{ items: ['Urban rail'] }] },
      want: {
        value: ['Urban rail'],
        promptContains: ['focus on transit', '<region>', 'Southeast Asia'],
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm: mockLlm });
    const result = await commonalities(inputs.items, inputs.instructions);
    const prompt = mockLlm.mock.calls[0]?.[0];
    return { result, prompt };
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result.result).toEqual(want.value);
    if (want.promptContains) {
      for (const fragment of want.promptContains) expect(result.prompt).toContain(fragment);
    }
  },
});

testPromptShapingOption('depth', {
  invoke: (config) => commonalities(['apple', 'orange'], config),
  setupMocks: () => mockLlm.mockResolvedValueOnce({ items: ['Fruits'] }),
  llmMock: mockLlm,
  markers: { low: 'literal', high: 'structural patterns' },
});
