import { vi, beforeEach, expect } from 'vitest';
import commonalities from './index.js';
import mockLlm from '../../lib/llm/index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import { runTable, equals, all, contains } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => mockLlm.mockReset());

const examples = [
  { name: 'empty input → empty array', inputs: { items: [] }, check: equals([]) },
  { name: 'single item → empty array', inputs: { items: ['item1'] }, check: equals([]) },
  {
    name: 'finds common threads between items',
    inputs: {
      items: ['smartphone', 'laptop', 'tablet'],
      preMock: () =>
        mockLlm.mockResolvedValueOnce({
          items: ['Portable electronics', 'Computing devices'],
        }),
    },
    check: equals(['Portable electronics', 'Computing devices']),
  },
  {
    name: 'parses items array from LLM response',
    inputs: {
      items: ['car', 'bicycle', 'motorcycle'],
      preMock: () =>
        mockLlm.mockResolvedValueOnce({ items: ['Transportation', 'Wheeled vehicles'] }),
    },
    check: equals(['Transportation', 'Wheeled vehicles']),
  },
  {
    name: 'no commonalities → empty array',
    inputs: {
      items: ['apple', 'car'],
      preMock: () => mockLlm.mockResolvedValueOnce({ items: [] }),
    },
    check: equals([]),
  },
  {
    name: 'unexpected LLM response handled gracefully',
    inputs: {
      items: ['item1', 'item2'],
      preMock: () => mockLlm.mockResolvedValueOnce(undefined),
    },
    check: equals([]),
  },
  {
    name: 'positional instructions reach the prompt',
    inputs: {
      items: ['bus', 'subway', 'taxi'],
      instructions: 'focus on public transportation in cities',
      preMock: () => mockLlm.mockResolvedValueOnce({ items: ['Urban transport'] }),
    },
    check: all(equals(['Urban transport']), () => {
      expect(mockLlm.mock.calls[0][0]).toContain('focus on public transportation in cities');
    }),
  },
  {
    name: 'instruction-bundle context wires into the prompt',
    inputs: {
      items: ['bus', 'subway'],
      instructions: { text: 'focus on transit', region: 'Southeast Asia' },
      preMock: () => mockLlm.mockResolvedValueOnce({ items: ['Urban rail'] }),
      returnPrompt: true,
    },
    check: all(contains('focus on transit'), contains('<region>'), contains('Southeast Asia')),
  },
];

runTable({
  describe: 'commonalities',
  examples,
  process: async ({ items, instructions, preMock, returnPrompt }) => {
    if (preMock) preMock();
    const result = await commonalities(items, instructions);
    return returnPrompt ? mockLlm.mock.calls[0][0] : result;
  },
});

testPromptShapingOption('depth', {
  invoke: (config) => commonalities(['apple', 'orange'], config),
  setupMocks: () => mockLlm.mockResolvedValueOnce({ items: ['Fruits'] }),
  llmMock: mockLlm,
  markers: { low: 'literal', high: 'structural patterns' },
});
