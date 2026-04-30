import { describe, it, expect } from 'vitest';
import codeFeatures from './code-features.js';

describe('codeFeatures', () => {
  it('includes the code text in a tagged section', () => {
    const code = 'function add(a, b) { return a + b; }';
    const result = codeFeatures({ text: code, schema: {} });
    expect(result).toContain(code);
    expect(result).toContain('<code-to-analyze');
  });

  it('includes the schema as formatted JSON', () => {
    const schema = {
      type: 'object',
      properties: {
        complexity: { type: 'number', description: 'Code complexity score' },
      },
    };
    const result = codeFeatures({ text: 'code', schema });
    expect(result).toContain('"complexity"');
    expect(result).toContain('Code complexity score');
  });

  it('instructs scoring between 0.0 and 1.0', () => {
    const result = codeFeatures({ text: 'code', schema: {} });
    expect(result).toContain('0.0');
    expect(result).toContain('1.0');
  });

  it('instructs numeric decimal values', () => {
    const result = codeFeatures({ text: 'x', schema: {} });
    expect(result).toContain('numeric decimal values');
  });

  it('excludes comment/description/summary properties from output', () => {
    const result = codeFeatures({ text: 'x', schema: {} });
    expect(result).toContain('no comment, description, summary');
  });

  it('marks code as do-not-output', () => {
    const result = codeFeatures({ text: 'x', schema: {} });
    expect(result).toContain('do-not-output');
  });
});
