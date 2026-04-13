import { describe, it, expect } from 'vitest';
import templateBuilder, { slot } from './index.js';

describe('templateBuilder', () => {
  it('renders a template with filled required slots', () => {
    const t = templateBuilder`Hello ${slot('name')}, welcome to ${slot('place')}`;
    const result = t.setAll({ name: 'Alice', place: 'Wonderland' }).build();
    expect(result).toBe('Hello Alice, welcome to Wonderland');
  });

  it('throws on unfilled required slot during build', () => {
    const t = templateBuilder`Hello ${slot('name')}`;
    expect(() => t.build()).toThrow("Required slot 'name' has no value");
  });

  it('renders optional unfilled slots as empty', () => {
    const t = templateBuilder`Hello${slot('suffix', { optional: true })}World`;
    const result = t.build();
    expect(result).toBe('HelloWorld');
  });

  it('renders optional filled slots normally', () => {
    const t = templateBuilder`Hello ${slot('suffix', { optional: true })}World`;
    const result = t.set('suffix', 'Beautiful ').build();
    expect(result).toBe('Hello Beautiful World');
  });

  it('supports partial build — leaves required slots empty without throwing', () => {
    const t = templateBuilder`Hello ${slot('name')}, welcome`;
    const result = t.build({ partial: true });
    expect(result).toBe('Hello , welcome');
  });

  it('is immutable — set returns a new instance', () => {
    const t = templateBuilder`${slot('a')} and ${slot('b')}`;
    const t2 = t.set('a', 'X');
    const t3 = t2.set('b', 'Y');

    // Original unchanged
    expect(() => t.build()).toThrow();
    // t2 only has 'a'
    expect(() => t2.build()).toThrow();
    // t3 has both
    expect(t3.build()).toBe('X and Y');
  });

  it('setAll sets multiple slots at once', () => {
    const t = templateBuilder`${slot('a')} ${slot('b')} ${slot('c')}`;
    const result = t.setAll({ a: '1', b: '2', c: '3' }).build();
    expect(result).toBe('1 2 3');
  });

  it('setAll is also immutable', () => {
    const t = templateBuilder`${slot('a')}`;
    const t2 = t.setAll({ a: 'X' });
    expect(() => t.build()).toThrow();
    expect(t2.build()).toBe('X');
  });

  it('later set overwrites earlier set for the same slot', () => {
    const t = templateBuilder`${slot('a')}`;
    const result = t.set('a', 'first').set('a', 'second').build();
    expect(result).toBe('second');
  });

  it('collapses blank lines from unfilled optional slots', () => {
    const t = templateBuilder`Line one.

${slot('middle', { optional: true })}

Line three.`;
    const result = t.build();
    expect(result).toBe('Line one.\n\nLine three.');
  });

  it('exposes slots map for introspection', () => {
    const t = templateBuilder`${slot('a')} ${slot('b', { optional: true })}`;
    const t2 = t.set('a', 'X');

    const slots = t2.slots;
    expect(slots.get('a')).toEqual({ optional: false, filled: true });
    expect(slots.get('b')).toEqual({ optional: true, filled: false });
  });

  it('throws on non-slot expressions', () => {
    expect(() => templateBuilder`Hello ${'not a slot'}`).toThrow('must be a slot() descriptor');
  });

  it('works with no slots — returns the template text', () => {
    const t = templateBuilder`Just plain text`;
    expect(t.build()).toBe('Just plain text');
  });

  it('trims leading and trailing whitespace from output', () => {
    const t = templateBuilder`
${slot('a')}
`;
    expect(t.set('a', 'hello').build()).toBe('hello');
  });
});
