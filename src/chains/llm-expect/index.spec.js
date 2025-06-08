import { describe, expect as vitestExpect, it, vi, beforeEach, afterEach } from 'vitest';
import llmExpect, { expect } from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('llm-expect chain', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.LLM_EXPECT_MODE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LLM_EXPECT_MODE = originalEnv;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  describe('Enhanced API', () => {
    it(
      'should return structured results in none mode',
      async () => {
        process.env.LLM_EXPECT_MODE = 'none';

        const [passed, details] = await expect('hello', 'hello');

        vitestExpect(passed).toBe(true);
        vitestExpect(details).toHaveProperty('passed', true);
        vitestExpect(details).toHaveProperty('advice');
        vitestExpect(details).toHaveProperty('file');
        vitestExpect(details).toHaveProperty('line');
      },
      longTestTimeout
    );

    it(
      'should handle failed assertions in none mode',
      async () => {
        process.env.LLM_EXPECT_MODE = 'none';

        const [passed, details] = await expect('hello', 'goodbye');

        vitestExpect(passed).toBe(false);
        vitestExpect(details.passed).toBe(false);
        vitestExpect(details).toHaveProperty('advice');
        vitestExpect(details).toHaveProperty('file');
        vitestExpect(details).toHaveProperty('line');
      },
      longTestTimeout
    );

    it(
      'should throw errors in error mode',
      async () => {
        process.env.LLM_EXPECT_MODE = 'error';

        await vitestExpect(async () => {
          await expect('hello', 'goodbye');
        }).rejects.toThrow('LLM Assertion Failed');
      },
      longTestTimeout
    );

    it(
      'should log in info mode',
      async () => {
        process.env.LLM_EXPECT_MODE = 'info';
        const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const [passed] = await expect('hello', 'goodbye');

        vitestExpect(passed).toBe(false);
        vitestExpect(consoleSpy).toHaveBeenCalledWith(
          vitestExpect.stringContaining('LLM Assertion Failed')
        );

        consoleSpy.mockRestore();
      },
      longTestTimeout
    );

    it(
      'should handle constraint-based validation',
      async () => {
        process.env.LLM_EXPECT_MODE = 'none';

        const [passed, details] = await expect('Hello world!', 'Is this a greeting?');

        vitestExpect(passed).toBe(true);
        vitestExpect(details.passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should validate content quality',
      async () => {
        const [passed, details] = await expect(
          'This is a well-written, professional email with proper grammar and clear intent.',
          'Is this text professional and grammatically correct?'
        );

        vitestExpect(passed).toBe(true);
        vitestExpect(details).toHaveProperty('file');
        vitestExpect(details).toHaveProperty('line');
      },
      longTestTimeout
    );

    it(
      'should validate data structures',
      async () => {
        const [passed] = await expect(
          { name: 'John Doe', age: 30, city: 'New York' },
          'Does this person data look realistic?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should handle business logic validation',
      async () => {
        const [passed] = await expect(
          'Increase marketing budget by 20% for Q4 to boost holiday sales',
          'Is this recommendation specific and actionable?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );

    it('should throw error when neither expected nor constraint provided', async () => {
      await vitestExpect(async () => {
        await expect('test value');
      }).rejects.toThrow('Either expected value or constraint must be provided');
    });
  });

  describe('Simple API (backward compatibility)', () => {
    it(
      'should pass for exact equality',
      async () => {
        const result = await llmExpect('hello', 'hello');
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should pass for constraint-based validation',
      async () => {
        const result = await llmExpect('Hello world!', 'Is this a greeting?');
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should fail for non-matching values',
      async () => {
        const result = await llmExpect('goodbye', 'hello');
        vitestExpect(result).toBe(false);
      },
      longTestTimeout
    );

    it(
      'should validate content quality',
      async () => {
        const result = await llmExpect(
          'This is a well-written, professional email with proper grammar.',
          'Is this text professional and grammatically correct?'
        );
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );
  });

  describe('Environment variable handling', () => {
    it(
      'should default to none mode when env var is not set',
      async () => {
        delete process.env.LLM_EXPECT_MODE;

        const [passed] = await expect('hello', 'goodbye');
        vitestExpect(passed).toBe(false);
        // Should not throw in none mode
      },
      longTestTimeout
    );

    it(
      'should handle invalid env var values',
      async () => {
        process.env.LLM_EXPECT_MODE = 'invalid';

        const [passed] = await expect('hello', 'goodbye');
        vitestExpect(passed).toBe(false);
        // Should default to none mode and not throw
      },
      longTestTimeout
    );
  });

  describe('Advanced features', () => {
    it(
      'should provide file and line information',
      async () => {
        const [, details] = await expect('hello', 'hello');

        vitestExpect(details.file).toBeDefined();
        vitestExpect(details.line).toBeTypeOf('number');
        vitestExpect(details.line).toBeGreaterThan(0);
      },
      longTestTimeout
    );

    it(
      'should handle complex object comparisons',
      async () => {
        const userProfile = {
          name: 'Alice Johnson',
          skills: ['JavaScript', 'Python', 'React'],
          experience: '5 years',
          level: 'Senior Developer',
        };

        const [passed] = await expect(
          userProfile,
          'Does this profile represent an experienced software developer with modern skills?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should validate creative content',
      async () => {
        const storyOpening =
          'Once upon a time, in a land far away, there lived a brave knight who embarked on a quest to save the kingdom from an ancient curse.';

        const [passed] = await expect(
          storyOpening,
          'Is this story opening engaging and sets up a clear adventure narrative?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );
  });
});
