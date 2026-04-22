import { describe, it, expect } from 'vitest';
import asJSONSchema from './as-json-schema.js';

describe('asJSONSchema', () => {
  it('includes the properties description in the prompt', () => {
    const result = asJSONSchema('name (string), age (integer), email (string, format: email)');
    expect(result).toContain('name (string), age (integer), email (string, format: email)');
  });

  it('asks for JSONSchema definition', () => {
    const result = asJSONSchema('a color field');
    expect(result).toContain('JSONSchema definition');
  });

  it('includes JSON metadata instruction', () => {
    const result = asJSONSchema('title and description');
    expect(result).toContain('JSON comments');
  });

  it('includes onlyJSON constant for output format', () => {
    const result = asJSONSchema('any properties');
    expect(result).toContain('JSON.parse');
  });
});
