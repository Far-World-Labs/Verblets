import { describe, it, expect } from 'vitest';
import asSchemaOrgType from './as-schema-org-type.js';

describe('asSchemaOrgType', () => {
  it('returns type instruction for a given type', () => {
    expect(asSchemaOrgType('Person')).toBe('Ensure the type is Person. ');
  });

  it('returns empty string for falsy type', () => {
    expect(asSchemaOrgType('')).toBe('');
    expect(asSchemaOrgType(undefined)).toBe('');
    expect(asSchemaOrgType(null)).toBe('');
  });

  it('works with any schema.org type string', () => {
    expect(asSchemaOrgType('Organization')).toBe('Ensure the type is Organization. ');
    expect(asSchemaOrgType('Event')).toBe('Ensure the type is Event. ');
  });
});
