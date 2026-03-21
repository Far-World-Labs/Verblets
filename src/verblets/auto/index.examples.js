import { describe } from 'vitest';
import auto from './index.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('Auto verblet');

describe('Auto verblet', () => {
  it('test', async () => {
    const result = await auto('test');
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('functionArgsAsArray');
  });
});
