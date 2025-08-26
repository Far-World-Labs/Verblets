import { describe, it, expect, vi } from 'vitest';
import makePrompt from './index.js';

// Mock chatGPT
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

describe('phailForge/makePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enhance a simple prompt to expert level', async () => {
    const { default: chatGPT } = await import('../../lib/chatgpt/index.js');

    const simplePrompt = 'create a webapp';
    const mockEnhanced =
      'Create a single-page web application with responsive design, error handling, state management, and accessibility features. Use modern JavaScript framework (React/Vue/Angular), implement proper routing, include build tooling (Webpack/Vite), and ensure cross-browser compatibility.';

    chatGPT.mockResolvedValueOnce({
      enhanced: mockEnhanced,
      improvements: [
        { category: 'technical', description: 'Added framework specification' },
        { category: 'defaults', description: 'Included error handling and accessibility' },
      ],
      keywords: ['SPA', 'responsive', 'routing', 'build tooling'],
    });

    const result = await makePrompt(simplePrompt);

    expect(result.enhanced).toBe(mockEnhanced);
    expect(result.enhanced.length).toBeGreaterThan(simplePrompt.length);
    expect(result.improvements).toBeDefined();
    expect(Array.isArray(result.improvements)).toBe(true);
    expect(result.metadata?.expansionRatio).toBeGreaterThan(1);
  });

  it('should add technical terminology and specifications', async () => {
    const { default: chatGPT } = await import('../../lib/chatgpt/index.js');

    const simplePrompt = 'analyze this text for sentiment';
    const mockEnhanced =
      'Perform sentiment analysis on the provided text using NLP techniques. Classify sentiment as positive, negative, or neutral with confidence scores. Extract key emotional indicators, identify sentiment-bearing phrases, and provide granular aspect-based sentiment when applicable.';

    chatGPT.mockResolvedValueOnce({
      enhanced: mockEnhanced,
      improvements: [{ category: 'technical', description: 'Added NLP terminology' }],
      keywords: ['NLP', 'confidence scores', 'aspect-based', 'emotional indicators'],
    });

    const result = await makePrompt(simplePrompt);

    expect(result.enhanced).toContain('sentiment');
    expect(result.keywords).toBeDefined();
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  it('should provide analysis when requested', async () => {
    const { default: chatGPT } = await import('../../lib/chatgpt/index.js');

    const simplePrompt = 'sort this list';
    const mockEnhanced =
      'Sort the provided list using an appropriate algorithm based on data characteristics';

    chatGPT.mockResolvedValueOnce({
      enhanced: mockEnhanced,
      improvements: [],
      keywords: ['algorithm', 'sorting'],
    });

    chatGPT.mockResolvedValueOnce({
      strengths: [{ aspect: 'clarity', detail: 'Clear algorithmic approach' }],
      opportunities: [{ aspect: 'specificity', detail: 'Could specify sort order' }],
      suggestions: ['Add stability requirements', 'Specify comparison function'],
    });

    const result = await makePrompt(simplePrompt, { analyze: true });

    expect(result.analysis).toBeDefined();
    expect(result.analysis.strengths).toBeDefined();
    expect(result.analysis.opportunities).toBeDefined();
    expect(result.analysis.suggestions).toBeDefined();
  });

  it('should handle domain context', async () => {
    const { default: chatGPT } = await import('../../lib/chatgpt/index.js');

    const simplePrompt = 'optimize performance';
    const mockEnhanced =
      'Optimize React application performance with Redux state management. Implement React.memo, useMemo, and useCallback for component optimization. Normalize Redux state shape, use reselect for memoized selectors, and implement code splitting with React.lazy.';

    chatGPT.mockResolvedValueOnce({
      enhanced: mockEnhanced,
      improvements: [
        { category: 'technical', description: 'Added React-specific optimizations' },
        { category: 'specificity', description: 'Included Redux optimization patterns' },
      ],
      keywords: ['React.memo', 'reselect', 'code splitting', 'memoization'],
    });

    const result = await makePrompt(simplePrompt, {
      context: 'React web application with Redux state management',
    });

    expect(result.enhanced).toBeDefined();
    expect(result.improvements.length).toBeGreaterThan(0);
  });
});
