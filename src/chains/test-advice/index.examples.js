import { beforeAll, afterAll, describe } from 'vitest';
import testAdvice from './index.js';
import { longTestTimeout, shouldRunLongExamples } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const { it, expect, aiExpect } = getTestHelpers('Test-advice chain');

let testDir;

describe.skipIf(!shouldRunLongExamples)('test-advice chain', () => {
  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-advice-test-'));
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  it(
    'provides comprehensive testing advice for a function',
    async () => {
      const testFilePath = path.join(testDir, 'sample-function.js');

      // Create a sample function with some edge cases
      await fs.writeFile(
        testFilePath,
        `
      /**
       * Calculates the factorial of a number
       * @param {number} n - The number to calculate factorial for
       * @returns {number} The factorial of n
       */
      function factorial(n) {
        if (n < 0) return undefined;
        if (n === 0 || n === 1) return 1;
        return n * factorial(n - 1);
      }
      
      module.exports = { factorial };
    `
      );

      const advice = await testAdvice(testFilePath);

      expect(Array.isArray(advice)).toBe(true);
      expect(advice.length).toBeGreaterThan(0);

      // Test advice runs multiple analysis passes, so should have many suggestions
      expect(advice.length).toBeGreaterThan(5);

      // Should contain various types of advice
      await aiExpect(advice).toSatisfy(
        'Should contain diverse testing advice including boundary conditions, success cases, failure cases, and code quality suggestions'
      );
    },
    longTestTimeout
  );

  it(
    'identifies issues in code with bugs',
    async () => {
      const testFilePath = path.join(testDir, 'buggy-code.js');

      // Create code with intentional issues
      await fs.writeFile(
        testFilePath,
        `
      function average(numbers) {
        // Bug: doesn't handle empty array
        let sum = 0;
        for (let i = 0; i <= numbers.length; i++) { // Bug: off-by-one error
          sum += numbers[i];
        }
        return sum / numbers.length;
      }
      
      function findMax(arr) {
        // Bug: doesn't handle empty array
        let max = arr[0];
        for (let i = 0; i < arr.length; i++) { // Bug: starts at 0 but already used arr[0]
          if (arr[i] > max) max = arr[i];
        }
        return max;
      }
      
      module.exports = { average, findMax };
    `
      );

      const advice = await testAdvice(testFilePath);

      expect(Array.isArray(advice)).toBe(true);
      expect(advice.length).toBeGreaterThan(0);

      // Should identify multiple issues
      await aiExpect(advice).toSatisfy(
        'Should identify issues like off-by-one errors, missing null/empty array checks, and other bugs'
      );
    },
    longTestTimeout
  );
});
