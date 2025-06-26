import { describe, expect, it } from 'vitest';
import templateReplace from './index.js';

describe('templateReplace', () => {
  it('replaces single placeholder', () => {
    const result = templateReplace('Hello {name}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('replaces multiple placeholders', () => {
    const result = templateReplace('Hello {name}, you are {age} years old', {
      name: 'John',
      age: 30,
    });
    expect(result).toBe('Hello John, you are 30 years old');
  });

  it('replaces multiple instances of same placeholder', () => {
    const result = templateReplace('{name} said "{name} is great"', { name: 'Alice' });
    expect(result).toBe('Alice said "Alice is great"');
  });

  it('handles missing data gracefully', () => {
    const result = templateReplace('Hello {name}!', {});
    expect(result).toBe('Hello !');
  });

  it('uses custom missing value when provided', () => {
    const result = templateReplace('Hello {name}!', {}, 'UNKNOWN');
    expect(result).toBe('Hello UNKNOWN!');
  });

  it('handles null/undefined values', () => {
    const result = templateReplace('Value: {value}', { value: null });
    expect(result).toBe('Value: ');
  });

  it('handles non-string values', () => {
    const result = templateReplace('Count: {count}, Active: {active}', {
      count: 42,
      active: true,
    });
    expect(result).toBe('Count: 42, Active: true');
  });

  it('returns original template when no data provided', () => {
    const result = templateReplace('Hello {name}!');
    expect(result).toBe('Hello {name}!');
  });

  it('returns original template when data is not an object', () => {
    const result = templateReplace('Hello {name}!', 'not an object');
    expect(result).toBe('Hello {name}!');
  });

  it('handles empty template', () => {
    const result = templateReplace('', { name: 'test' });
    expect(result).toBe('');
  });

  it('handles template with no placeholders', () => {
    const result = templateReplace('Just plain text', { name: 'test' });
    expect(result).toBe('Just plain text');
  });
});
