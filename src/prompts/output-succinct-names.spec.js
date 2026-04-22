import { describe, it, expect } from 'vitest';
import outputSuccinctNames from './output-succinct-names.js';

describe('outputSuccinctNames', () => {
  it('uses default word limit of 10', () => {
    const result = outputSuccinctNames();
    expect(result).toBe('Provide a (<10 words) descriptive name for each result.');
  });

  it('uses custom word limit', () => {
    const result = outputSuccinctNames(5);
    expect(result).toBe('Provide a (<5 words) descriptive name for each result.');
  });

  it('uses custom large word limit', () => {
    const result = outputSuccinctNames(25);
    expect(result).toContain('<25 words');
  });
});
