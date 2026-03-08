import { describe, expect, it } from 'vitest';

import toEnum from './index.js';

describe('toEnum', () => {
  const colors = { red: 'red', green: 'green', blue: 'blue' };

  it('matches an exact key', () => {
    expect(toEnum('red', colors)).toBe('red');
  });

  it('matches case-insensitively', () => {
    expect(toEnum('RED', colors)).toBe('red');
    expect(toEnum('Green', colors)).toBe('green');
  });

  it('returns undefined for unrecognized values', () => {
    expect(toEnum('purple', colors)).toBeUndefined();
  });

  it('strips surrounding quotes', () => {
    expect(toEnum('"blue"', colors)).toBe('blue');
  });

  it('strips trailing punctuation', () => {
    expect(toEnum('red.', colors)).toBe('red');
  });

  it('handles "Answer:" prefix', () => {
    expect(toEnum('Answer: green', colors)).toBe('green');
  });

  it('handles whitespace', () => {
    expect(toEnum('  blue  ', colors)).toBe('blue');
  });

  it('returns undefined for empty string', () => {
    expect(toEnum('', colors)).toBeUndefined();
  });
});
