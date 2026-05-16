import { describe, it, expect } from 'vitest';
import wrapVariable, { asXML, quote } from './wrap-variable.js';

describe('asXML', () => {
  it('wraps a string in XML tags with default tag name', () => {
    const result = asXML('hello world');
    expect(result).toBe('<data>\nhello world\n</data>');
  });

  it('returns empty string for falsy variable', () => {
    expect(asXML('')).toBe('');
    expect(asXML(undefined)).toBe('');
    expect(asXML(null)).toBe('');
    expect(asXML(0)).toBe('');
  });

  it('uses custom tag name', () => {
    const result = asXML('content', { tag: 'schema' });
    expect(result).toBe('<schema>\ncontent\n</schema>');
  });

  it('includes name attribute when provided', () => {
    const result = asXML('content', { name: 'myField' });
    expect(result).toBe('<data name="myField">\ncontent\n</data>');
  });

  it('prepends title when variable has content', () => {
    const result = asXML('content', { title: 'Section:' });
    expect(result).toBe('Section: <data>\ncontent\n</data>');
  });

  it('omits newlines when fit is not comfortable', () => {
    const result = asXML('content', { fit: 'tight' });
    expect(result).toBe('<data>content</data>');
  });

  it('serializes non-string variables as JSON', () => {
    const result = asXML({ key: 'value' });
    expect(result).toContain('"key": "value"');
    expect(result).toMatch(/^<data>\n/);
    expect(result).toMatch(/\n<\/data>$/);
  });

  it('serializes arrays as JSON', () => {
    const result = asXML([1, 2, 3]);
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('3');
  });

  it('combines tag, name, title, and fit', () => {
    const result = asXML('data here', {
      tag: 'criteria',
      name: 'sort',
      title: 'Sort by:',
      fit: 'tight',
    });
    expect(result).toBe('Sort by: <criteria name="sort">data here</criteria>');
  });
});

describe('quote', () => {
  it('wraps a string in quotes', () => {
    expect(quote('hello')).toBe('"hello"');
  });

  it('returns empty string for falsy variable', () => {
    expect(quote('')).toBe('');
    expect(quote(undefined)).toBe('');
    expect(quote(null)).toBe('');
  });

  it('prepends title when provided', () => {
    expect(quote('hello', { title: 'Name:' })).toBe('Name: "hello"');
  });

  it('serializes non-string variables as JSON', () => {
    const result = quote({ key: 'value' });
    expect(result).toContain('"key": "value"');
    expect(result).toMatch(/^"/);
  });
});

describe('wrapVariable (default export)', () => {
  it('uses quotes for single-line content', () => {
    const result = wrapVariable('short text');
    expect(result).toBe('"short text"');
  });

  it('uses XML for multi-line content', () => {
    const result = wrapVariable('line one\nline two');
    expect(result).toContain('<data>');
    expect(result).toContain('</data>');
  });

  it('uses XML when forceHTML is true', () => {
    const result = wrapVariable('short text', { forceHTML: true });
    expect(result).toContain('<data>');
  });

  it('uses XML when name is provided', () => {
    const result = wrapVariable('short text', { name: 'field' });
    expect(result).toContain('<data name="field">');
  });

  it('passes tag option through to asXML', () => {
    const result = wrapVariable('line\nbreak', { tag: 'content' });
    expect(result).toContain('<content>');
    expect(result).toContain('</content>');
  });

  it('passes title through', () => {
    const result = wrapVariable('short', { title: 'Label:' });
    expect(result).toBe('Label: "short"');
  });

  it('serializes object variables', () => {
    const result = wrapVariable({ a: 1 });
    expect(result).toContain('<data>');
    expect(result).toContain('"a": 1');
  });
});
