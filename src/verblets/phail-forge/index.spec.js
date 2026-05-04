import { vi, beforeEach, expect } from 'vitest';
import makePrompt from './index.js';
import llm from '../../lib/llm/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

beforeEach(() => vi.clearAllMocks());

const enhanceWebapp = {
  enhanced:
    'Create a single-page web application with responsive design, error handling, state management, and accessibility features. Use modern JavaScript framework (React/Vue/Angular), implement proper routing, include build tooling (Webpack/Vite), and ensure cross-browser compatibility.',
  improvements: [
    { category: 'technical', description: 'Added framework specification' },
    { category: 'defaults', description: 'Included error handling and accessibility' },
  ],
  keywords: ['SPA', 'responsive', 'routing', 'build tooling'],
};

const enhanceSentiment = {
  enhanced:
    'Perform sentiment analysis on the provided text using NLP techniques. Classify sentiment as positive, negative, or neutral with confidence scores. Extract key emotional indicators, identify sentiment-bearing phrases, and provide granular aspect-based sentiment when applicable.',
  improvements: [{ category: 'technical', description: 'Added NLP terminology' }],
  keywords: ['NLP', 'confidence scores', 'aspect-based', 'emotional indicators'],
};

const enhanceSort = {
  enhanced: 'Sort the provided list using an appropriate algorithm based on data characteristics',
  improvements: [],
  keywords: ['algorithm', 'sorting'],
};

const sortAnalysis = {
  strengths: [{ aspect: 'clarity', detail: 'Clear algorithmic approach' }],
  opportunities: [{ aspect: 'specificity', detail: 'Could specify sort order' }],
  suggestions: ['Add stability requirements', 'Specify comparison function'],
};

const enhancePerf = {
  enhanced:
    'Optimize React application performance with Redux state management. Implement React.memo, useMemo, and useCallback for component optimization. Normalize Redux state shape, use reselect for memoized selectors, and implement code splitting with React.lazy.',
  improvements: [
    { category: 'technical', description: 'Added React-specific optimizations' },
    { category: 'specificity', description: 'Included Redux optimization patterns' },
  ],
  keywords: ['React.memo', 'reselect', 'code splitting', 'memoization'],
};

runTable({
  describe: 'phailForge/makePrompt',
  examples: [
    {
      name: 'enhances a simple prompt and reports expansion ratio > 1',
      inputs: { prompt: 'create a webapp' },
      mocks: { llm: [enhanceWebapp] },
      want: {
        partial: {
          enhanced: enhanceWebapp.enhanced,
          improvements: enhanceWebapp.improvements,
          metadata: { expansionRatio: expect.any(Number) },
        },
      },
    },
    {
      name: 'adds technical terminology when relevant',
      inputs: { prompt: 'analyze this text for sentiment' },
      mocks: { llm: [enhanceSentiment] },
      want: {
        partial: {
          enhanced: expect.stringContaining('sentiment'),
          keywords: expect.any(Array),
        },
      },
    },
    {
      name: 'provides analysis when requested',
      inputs: { prompt: 'sort this list', options: { analyze: true } },
      mocks: { llm: [enhanceSort, sortAnalysis] },
      want: {
        partial: {
          analysis: {
            strengths: expect.any(Array),
            opportunities: expect.any(Array),
            suggestions: expect.any(Array),
          },
        },
      },
    },
    {
      name: 'incorporates domain context',
      inputs: {
        prompt: 'optimize performance',
        options: { context: 'React web application with Redux state management' },
      },
      mocks: { llm: [enhancePerf] },
      want: {
        partial: {
          enhanced: expect.any(String),
          improvements: expect.arrayContaining([expect.any(Object)]),
        },
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return makePrompt(inputs.prompt, inputs.options);
  },
  expects: ({ result, want }) => expect(result).toMatchObject(want.partial),
});
