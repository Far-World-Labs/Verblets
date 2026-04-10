import { describe } from 'vitest';
import auto from './index.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Auto verblet');

describe('Auto verblet', () => {
  it('test', async () => {
    const result = await auto('test');
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('functionArgsAsArray');
    await aiExpect(result).toSatisfy(
      'an auto-routing result that selected a function and returned structured arguments'
    );
  });
});
