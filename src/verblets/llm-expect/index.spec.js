import { describe, expect, it } from 'vitest';
import llmExpect from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('llm-expect verblet', () => {
  it(
    'should pass for exact equality',
    async () => {
      const result = await llmExpect('hello', 'hello', undefined, { throw: false });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should pass for constraint-based validation',
    async () => {
      const result = await llmExpect('Hello world!', 'Is this a greeting?', undefined, {
        throw: false,
      });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should fail for non-matching values',
    async () => {
      const result = await llmExpect('goodbye', 'hello', undefined, { throw: false });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should throw by default on failure',
    async () => {
      await expect(async () => {
        await llmExpect('goodbye', 'hello');
      }).rejects.toThrow();
    },
    longTestTimeout
  );

  it(
    'should not throw when throw option is false',
    async () => {
      const result = await llmExpect('goodbye', 'hello', undefined, { throw: false });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should validate content quality',
    async () => {
      const result = await llmExpect(
        'This is a well-written, professional email with proper grammar.',
        'Is this text professional and grammatically correct?',
        undefined,
        { throw: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should validate data structures',
    async () => {
      const result = await llmExpect(
        { name: 'John Doe', age: 30, city: 'New York' },
        'Does this person data look realistic?',
        undefined,
        { throw: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should handle business logic validation',
    async () => {
      const result = await llmExpect(
        'Increase marketing budget by 20% for Q4 to boost holiday sales',
        'Is this recommendation specific and actionable?',
        undefined,
        { throw: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );
});
