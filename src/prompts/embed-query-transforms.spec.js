import { describe, it, expect } from 'vitest';
import {
  rewriteQuery,
  multiQuery,
  stepBack,
  decomposeQuery,
  hydeOutputDoc,
} from './embed-query-transforms.js';

describe('rewriteQuery', () => {
  it('includes the original query', () => {
    const result = rewriteQuery('how to fix npm err');
    expect(result).toContain('how to fix npm err');
  });

  it('asks for rewriting with clarification', () => {
    const result = rewriteQuery('test query');
    expect(result).toContain('Rewrite');
    expect(result).toContain('clearer');
  });

  it('instructs to return only the rewritten query', () => {
    const result = rewriteQuery('q');
    expect(result).toContain('Return only the rewritten query');
  });
});

describe('multiQuery', () => {
  it('requests the specified number of diverse queries', () => {
    const result = multiQuery('machine learning basics');
    expect(result).toContain('3');
    expect(result).toContain('diverse search queries');
  });

  it('uses custom count', () => {
    const result = multiQuery('query', 5);
    expect(result).toContain('5');
  });

  it('includes divergence guidance when provided', () => {
    const result = multiQuery('query', 3, { divergenceGuidance: 'Focus on different domains' });
    expect(result).toContain('Focus on different domains');
  });

  it('omits divergence section when not provided', () => {
    const result = multiQuery('query', 3);
    const withGuidance = multiQuery('query', 3, { divergenceGuidance: 'MARKER' });
    expect(result).not.toContain('MARKER');
    expect(withGuidance).toContain('MARKER');
  });

  it('includes the original query', () => {
    const result = multiQuery('original question here');
    expect(result).toContain('original question here');
  });
});

describe('stepBack', () => {
  it('requests broader background questions', () => {
    const result = stepBack('how to configure webpack tree shaking');
    expect(result).toContain('broader');
    expect(result).toContain('fundamental');
  });

  it('uses default count of 3', () => {
    const result = stepBack('query');
    expect(result).toContain('3');
  });

  it('uses custom count', () => {
    const result = stepBack('query', 5);
    expect(result).toContain('5');
  });

  it('includes abstraction guidance when provided', () => {
    const result = stepBack('query', 3, { abstractionGuidance: 'Think about first principles' });
    expect(result).toContain('Think about first principles');
  });

  it('omits abstraction guidance when not provided', () => {
    const withGuidance = stepBack('q', 3, { abstractionGuidance: 'MARKER' });
    const without = stepBack('q', 3);
    expect(withGuidance).toContain('MARKER');
    expect(without).not.toContain('MARKER');
  });
});

describe('decomposeQuery', () => {
  it('asks to break query into sub-questions', () => {
    const result = decomposeQuery('How does React handle state and rendering?');
    expect(result).toContain('sub-questions');
    expect(result).toContain('atomic');
  });

  it('includes the original query', () => {
    const result = decomposeQuery('complex question here');
    expect(result).toContain('complex question here');
  });

  it('includes granularity guidance when provided', () => {
    const result = decomposeQuery('query', { granularityGuidance: 'Keep questions very specific' });
    expect(result).toContain('Keep questions very specific');
  });

  it('omits granularity guidance when not provided', () => {
    const result = decomposeQuery('query');
    const withGuidance = decomposeQuery('query', { granularityGuidance: 'MARKER' });
    expect(result).not.toContain('MARKER');
    expect(withGuidance).toContain('MARKER');
  });
});

describe('hydeOutputDoc', () => {
  it('asks for a short passage matching the query', () => {
    const result = hydeOutputDoc('benefits of TypeScript');
    expect(result).toContain('short passage');
    expect(result).toContain('2-4 sentences');
  });

  it('includes the query', () => {
    const result = hydeOutputDoc('my search query');
    expect(result).toContain('my search query');
  });

  it('instructs to write in document style', () => {
    const result = hydeOutputDoc('q');
    expect(result).toContain('style and vocabulary');
  });
});
