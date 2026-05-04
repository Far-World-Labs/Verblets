import { vi, beforeEach, expect } from 'vitest';
import embedMultiQuery from './index.js';
import mockLlm from '../../lib/llm/index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => mockLlm.mockReset());

const variantSet = [
  'How do plants photosynthesize?',
  'Plant energy conversion from sunlight',
  'Photosynthesis mechanism in green plants',
];

// Processor returns both the chain result and the prompt the LLM saw.
runTable({
  describe: 'embedMultiQuery',
  examples: [
    {
      name: 'returns the LLM variants and embeds the default count in the prompt',
      inputs: { query: 'how do plants make food' },
      mocks: { llm: [variantSet] },
      want: {
        length: 3,
        promptContains: 'how do plants make food',
        promptMatches: /\b3\b/,
      },
    },
    {
      name: 'embeds custom count in the prompt',
      inputs: { query: 'query', options: { count: 5 } },
      mocks: { llm: [[]] },
      want: {
        promptMatches: /\b5\b/,
        promptNotMatches: /\b3\b/,
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm: mockLlm });
    const result = await embedMultiQuery(inputs.query, inputs.options);
    return { result, prompt: mockLlm.mock.calls[0][0] };
  },
  expects: ({ result, want }) => {
    if ('length' in want) expect(result.result).toHaveLength(want.length);
    if ('promptContains' in want) expect(result.prompt).toContain(want.promptContains);
    if ('promptMatches' in want) expect(result.prompt).toMatch(want.promptMatches);
    if ('promptNotMatches' in want) expect(result.prompt).not.toMatch(want.promptNotMatches);
  },
});

testPromptShapingOption('divergence', {
  invoke: (config) => embedMultiQuery('query', config),
  setupMocks: () => mockLlm.mockResolvedValueOnce([]),
  llmMock: mockLlm,
  markers: { low: 'Stay close', high: 'Maximize diversity' },
});
