import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import date from './index.js';
import { expect as llmExpect } from '../llm-expect/index.js';
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
    'finds Christmas 2025',
    async () => {
      const result = await date('What day is Christmas in 2025?');
      expect(result instanceof Date).toBe(true);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(25);
    },
    longTestTimeout
  );
});
