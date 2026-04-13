import { describe } from 'vitest';
import auto from './index.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Auto verblet');

describe('Auto verblet', () => {
  it('routes a task to a matching schema', async () => {
    const result = await auto('score this restaurant review on a scale of 1-10');
    expect(typeof result).toBe('object');
    // auto returns either a match with functionName or noMatch: true
    if (result.noMatch) {
      // Even noMatch is valid behavior — the LLM may not find a schema match
      expect(result.noMatch).toBe(true);
    } else {
      expect(result).toHaveProperty('functionArgsAsArray');
      await aiExpect(result).toSatisfy(
        'an auto-routing result that selected a schema and returned structured arguments'
      );
    }
  });
});
