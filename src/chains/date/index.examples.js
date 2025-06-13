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
    'finds Christmas 2025',
    async () => {
      const result = await date(
        'What is the exact calendar date of Christmas Day in 2025? Please provide the date in UTC/GMT timezone.'
      );
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11); // December
      expect(result.getUTCDate()).toBe(25);
    },
    longTestTimeout
  );
});
