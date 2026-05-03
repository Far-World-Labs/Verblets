import { vi, beforeEach, expect } from 'vitest';
import embedMultiQuery from './index.js';
import mockLlm from '../../lib/llm/index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import { runTable, all, length, matches } from '../../lib/examples-runner/index.js';

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

const examples = [
  {
    name: 'returns the LLM variants and embeds the default count in the prompt',
    inputs: {
      query: 'how do plants make food',
      preMock: () => mockLlm.mockResolvedValueOnce(variantSet),
    },
    check: all(length(3), () => {
      const prompt = mockLlm.mock.calls[0][0];
      expect(prompt).toContain('how do plants make food');
      expect(prompt).toMatch(/\b3\b/);
    }),
  },
  {
    name: 'embeds custom count in the prompt',
    inputs: {
      query: 'query',
      options: { count: 5 },
      preMock: () => mockLlm.mockResolvedValueOnce([]),
      returnPrompt: true,
    },
    check: all(matches(/\b5\b/), (ctx) => {
      expect(ctx.result).not.toMatch(/\b3\b/);
    }),
  },
];

runTable({
  describe: 'embedMultiQuery',
  examples,
  process: async ({ query, options, preMock, returnPrompt }) => {
    if (preMock) preMock();
    const result = await embedMultiQuery(query, options);
    return returnPrompt ? mockLlm.mock.calls[0][0] : result;
  },
});

testPromptShapingOption('divergence', {
  invoke: (config) => embedMultiQuery('query', config),
  setupMocks: () => mockLlm.mockResolvedValueOnce([]),
  llmMock: mockLlm,
  markers: { low: 'Stay close', high: 'Maximize diversity' },
});
