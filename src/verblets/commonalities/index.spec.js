import { vi, beforeEach, expect } from 'vitest';
import commonalities from './index.js';
import mockLlm from '../../lib/llm/index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => mockLlm.mockReset());

// Processor returns { result, prompt } so the same expects can target both.
runTable({
  describe: 'commonalities',
  examples: [
    { name: 'empty input → empty array', inputs: { items: [], want: [] } },
    { name: 'single item → empty array', inputs: { items: ['item1'], want: [] } },
    {
      name: 'finds common threads between items',
      inputs: {
        items: ['smartphone', 'laptop', 'tablet'],
        mock: () =>
          mockLlm.mockResolvedValueOnce({
            items: ['Portable electronics', 'Computing devices'],
          }),
        want: ['Portable electronics', 'Computing devices'],
      },
    },
    {
      name: 'parses items array from LLM response',
      inputs: {
        items: ['car', 'bicycle', 'motorcycle'],
        mock: () =>
          mockLlm.mockResolvedValueOnce({ items: ['Transportation', 'Wheeled vehicles'] }),
        want: ['Transportation', 'Wheeled vehicles'],
      },
    },
    {
      name: 'no commonalities → empty array',
      inputs: {
        items: ['apple', 'car'],
        mock: () => mockLlm.mockResolvedValueOnce({ items: [] }),
        want: [],
      },
    },
    {
      name: 'unexpected LLM response handled gracefully',
      inputs: {
        items: ['item1', 'item2'],
        mock: () => mockLlm.mockResolvedValueOnce(undefined),
        want: [],
      },
    },
    {
      name: 'positional instructions reach the prompt',
      inputs: {
        items: ['bus', 'subway', 'taxi'],
        instructions: 'focus on public transportation in cities',
        mock: () => mockLlm.mockResolvedValueOnce({ items: ['Urban transport'] }),
        want: ['Urban transport'],
        wantPromptContains: ['focus on public transportation in cities'],
      },
    },
    {
      name: 'instruction-bundle context wires into the prompt',
      inputs: {
        items: ['bus', 'subway'],
        instructions: { text: 'focus on transit', region: 'Southeast Asia' },
        mock: () => mockLlm.mockResolvedValueOnce({ items: ['Urban rail'] }),
        want: ['Urban rail'],
        wantPromptContains: ['focus on transit', '<region>', 'Southeast Asia'],
      },
    },
  ],
  process: async ({ items, instructions, mock }) => {
    if (mock) mock();
    const result = await commonalities(items, instructions);
    const prompt = mockLlm.mock.calls[0]?.[0];
    return { result, prompt };
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result.result).toEqual(inputs.want);
    if ('wantPromptContains' in inputs) {
      for (const fragment of inputs.wantPromptContains) {
        expect(result.prompt).toContain(fragment);
      }
    }
  },
});

testPromptShapingOption('depth', {
  invoke: (config) => commonalities(['apple', 'orange'], config),
  setupMocks: () => mockLlm.mockResolvedValueOnce({ items: ['Fruits'] }),
  llmMock: mockLlm,
  markers: { low: 'literal', high: 'structural patterns' },
});
