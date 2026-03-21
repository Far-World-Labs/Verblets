import { describe } from 'vitest';
import toObject from './index.js';
import llm from '../../lib/llm/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('To-object chain');

describe('To object verblet', () => {
  it(
    'Describe SpaceX Starship',
    async () => {
      const llmResult = await llm('Describe SpaceX Starship');
      const result = await toObject(llmResult);
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});
