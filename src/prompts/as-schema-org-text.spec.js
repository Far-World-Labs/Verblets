import { describe, it, expect } from 'vitest';
import asSchemaOrgText from './as-schema-org-text.js';

describe('asSchemaOrgText', () => {
  it('includes the object name in the prompt', () => {
    const result = asSchemaOrgText('John Doe', 'Person');
    expect(result).toContain('"John Doe"');
  });

  it('includes schema.org format instruction', () => {
    const result = asSchemaOrgText('Acme Corp', 'Organization');
    expect(result).toContain('schema.org JSON format');
  });

  it('includes type enforcement when type is provided', () => {
    const result = asSchemaOrgText('Concert', 'Event');
    expect(result).toContain('Ensure the type is Event');
  });

  it('omits type text when type is not provided', () => {
    const result = asSchemaOrgText('something', '');
    expect(result).not.toContain('Ensure the type');
  });

  it('includes validation rules', () => {
    const result = asSchemaOrgText('test', 'Thing');
    expect(result).toContain('ensure values meant to be numbers are numbers');
    expect(result).toContain('ensure the type is a real schema.org type');
    expect(result).toContain('@context');
  });

  it('includes schema in XML tags when provided', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const result = asSchemaOrgText('test', 'Thing', schema);
    expect(result).toContain('<schema>');
    expect(result).toContain('</schema>');
    expect(result).toContain('"name"');
  });

  it('omits schema section when not provided', () => {
    const result = asSchemaOrgText('test', 'Thing');
    expect(result).not.toContain('<schema>');
  });

  it('includes onlyJSON output format', () => {
    const result = asSchemaOrgText('test', 'Thing');
    expect(result).toContain('JSON.parse');
  });
});
