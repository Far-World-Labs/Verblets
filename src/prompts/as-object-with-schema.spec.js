import { describe, it, expect } from 'vitest';
import asObjectWithSchema from './as-object-with-schema.js';

describe('asObjectWithSchema', () => {
  it('uses default schema when none provided', () => {
    const result = asObjectWithSchema();
    expect(result).toContain('"name": "<string>"');
  });

  it('formats schema properties with type annotations', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        count: { type: 'number' },
      },
    };
    const result = asObjectWithSchema(schema);
    expect(result).toContain('"title": "<string>"');
    expect(result).toContain('"count": "<number>"');
  });

  it('includes format and description annotations', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', description: 'User email address' },
      },
    };
    const result = asObjectWithSchema(schema);
    expect(result).toContain('format: email');
    expect(result).toContain('description: User email address');
  });

  it('excludes non-format/description annotations', () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'integer', minimum: 0, maximum: 150 },
      },
    };
    const result = asObjectWithSchema(schema);
    expect(result).not.toContain('minimum');
    expect(result).not.toContain('maximum');
  });

  it('includes contentIsExampleObject and onlyJSON constants', () => {
    const result = asObjectWithSchema();
    expect(result).toContain('must look like the following');
    expect(result).toContain('JSON.parse');
  });

  it('handles properties without explicit type', () => {
    const schema = {
      type: 'object',
      properties: {
        data: { description: 'Arbitrary data' },
      },
    };
    const result = asObjectWithSchema(schema);
    expect(result).toContain('"data": "<');
    expect(result).toContain('description: Arbitrary data');
  });
});
