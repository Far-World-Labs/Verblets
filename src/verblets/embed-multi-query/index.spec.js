import { vi, beforeEach, expect } from 'vitest';
import embedMultiQuery from './index.js';
import mockLlm from '../../lib/llm/index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
// Each row picks which assertions fire via control flags on inputs.
runTable({
  describe: 'embedMultiQuery',
  examples: [
    {
      name: 'returns the LLM variants and embeds the default count in the prompt',
      inputs: {
        query: 'how do plants make food',
        mock: () => mockLlm.mockResolvedValueOnce(variantSet),
        wantLength: 3,
        wantPromptContains: 'how do plants make food',
        wantPromptMatches: /\b3\b/,
      },
    },
    {
      name: 'embeds custom count in the prompt',
      inputs: {
        query: 'query',
        options: { count: 5 },
        mock: () => mockLlm.mockResolvedValueOnce([]),
        wantPromptMatches: /\b5\b/,
        wantPromptNotMatches: /\b3\b/,
      },
    },
  ],
  process: async ({ query, options, mock }) => {
    mock();
    const result = await embedMultiQuery(query, options);
    return { result, prompt: mockLlm.mock.calls[0][0] };
  },
  expects: ({ result, inputs }) => {
    if ('wantLength' in inputs) expect(result.result).toHaveLength(inputs.wantLength);
    if ('wantPromptContains' in inputs) {
      expect(result.prompt).toContain(inputs.wantPromptContains);
    }
    if ('wantPromptMatches' in inputs) expect(result.prompt).toMatch(inputs.wantPromptMatches);
    if ('wantPromptNotMatches' in inputs) {
      expect(result.prompt).not.toMatch(inputs.wantPromptNotMatches);
    }
  },
});

testPromptShapingOption('divergence', {
  invoke: (config) => embedMultiQuery('query', config),
  setupMocks: () => mockLlm.mockResolvedValueOnce([]),
  llmMock: mockLlm,
  markers: { low: 'Stay close', high: 'Maximize diversity' },
});
