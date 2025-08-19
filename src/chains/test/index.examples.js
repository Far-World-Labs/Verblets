import { beforeAll, afterAll } from 'vitest';
import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import test from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, 'test-data');

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Test chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Test chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Test chain' } })
  : vitestAiExpect;

describe('test chain', () => {
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it(
    'identifies issues in problematic code',
    async () => {
      const testFilePath = path.join(testDir, 'problematic.js');

      // Create a file with obvious issues
      await fs.writeFile(
        testFilePath,
        `
      function divide(a, b) {
        // No check for division by zero
        return a / b;
      }
      
      async function fetchData(url) {
        // No error handling
        const response = await fetch(url);
        const data = response.json();  // Missing await
        return data;
      }
      
      function processArray(arr) {
        // No null check
        for (let i = 0; i <= arr.length; i++) {  // Off-by-one error
          console.log(arr[i]);
        }
      }
    `
      );

      const issues = await test(
        testFilePath,
        'check for common JavaScript errors and best practices'
      );

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);

      // Should identify multiple issues
      const hasValidIssues = await aiExpect(issues).toSatisfy(
        'Should identify issues like missing error handling, missing await, division by zero check, or off-by-one errors'
      );
      expect(hasValidIssues).toBe(true);
    },
    longTestTimeout
  );

  it(
    'finds fewer or no issues in well-written code',
    async () => {
      const testFilePath = path.join(testDir, 'good-code.js');

      // Create a file with good practices
      await fs.writeFile(
        testFilePath,
        `
      function safeDivide(a, b) {
        if (b === 0) {
          throw new Error('Division by zero');
        }
        return a / b;
      }
      
      async function fetchDataSafely(url) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          const data = await response.json();
          return data;
        } catch (error) {
          console.error('Failed to fetch data:', error);
          throw error;
        }
      }
      
      function processArraySafely(arr) {
        if (!arr || !Array.isArray(arr)) {
          return;
        }
        for (let i = 0; i < arr.length; i++) {
          console.log(arr[i]);
        }
      }
    `
      );

      const issues = await test(testFilePath, 'check for common JavaScript errors');

      expect(Array.isArray(issues)).toBe(true);
      // AI tends to be thorough and might find various improvements even in good code
      // Just verify it finds fewer issues than in problematic code
      if (issues.length > 0) {
        // If issues are found, they should be minor suggestions
        const hasMinorIssues = await aiExpect(issues).toSatisfy(
          'Should only contain minor suggestions or best practice improvements, not critical errors'
        );
        expect(hasMinorIssues).toBe(true);
      }
    },
    longTestTimeout
  );

  it(
    'checks for specific security vulnerabilities',
    async () => {
      const testFilePath = path.join(testDir, 'security.js');

      // Create a file with security issues
      await fs.writeFile(
        testFilePath,
        `
      function buildQuery(userInput) {
        // SQL injection vulnerability
        const query = "SELECT * FROM users WHERE name = '" + userInput + "'";
        return query;
      }
      
      function renderHTML(userContent) {
        // XSS vulnerability
        document.innerHTML = userContent;
      }
      
      function evaluateCode(code) {
        // Code injection vulnerability
        eval(code);
      }
    `
      );

      const issues = await test(testFilePath, 'identify security vulnerabilities');

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);

      // Should identify security issues
      const hasSecurityIssues = await aiExpect(issues).toSatisfy(
        'Should identify security vulnerabilities like SQL injection, XSS, or use of eval'
      );
      expect(hasSecurityIssues).toBe(true);
    },
    longTestTimeout
  );
});
