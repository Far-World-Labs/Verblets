import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import date from './index.js';
import { expect as llmExpect } from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('date examples', () => {
  const originalMode = process.env.LLM_EXPECT_MODE;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
  });

  afterAll(() => {
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  it(
    'gets Star Wars release date',
    async () => {
      const result = await date('When was the original Star Wars released?');
      expect(result instanceof Date).toBe(true);
      const [reasonable] = await llmExpect(
        `Star Wars release date: ${result.toISOString()}`,
        undefined,
        'Is this close to the actual release date of the first Star Wars movie?'
      );
      expect(reasonable).toBe(true);
    },
    longTestTimeout
  );

  it(
    'finds specific date in 2025',
    async () => {
      const result = await date('When is the last day of Q3 in 2025?');
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(8); // September
      expect(result.getUTCDate()).toBe(30);
    },
    longTestTimeout
  );
});
