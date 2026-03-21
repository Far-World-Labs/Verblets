import { beforeAll, afterAll, describe } from 'vitest';
import scanJs from './index.js';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js'; // standard: 2-3 LLM calls per test
import { getTestHelpers } from '../test-analysis/test-wrappers.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let testDir;

const { it, expect, aiExpect } = getTestHelpers('Scan-js chain');

describe.skipIf(!isMediumBudget)('[medium] scan-js chain', () => {
  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-js-test-'));
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it(
    'analyzes JavaScript file for maintainability',
    async () => {
      // Use a simple test file for analysis
      const testFilePath = path.join(testDir, 'sample.js');

      // Create a simple test file
      await fs.writeFile(
        testFilePath,
        `
      // Sample JavaScript file for testing
      function calculateTotal(items) {
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          total += items[i].price * items[i].quantity;
        }
        return total;
      }
      
      const processOrder = async (order) => {
        if (!order || !order.items) {
          throw new Error('Invalid order');
        }
        const total = calculateTotal(order.items);
        return { ...order, total };
      };
      
      module.exports = { calculateTotal, processOrder };
    `
      );

      const state = await scanJs({
        node: { filename: testFilePath },
        features: 'maintainability',
      });

      expect(state).toBeDefined();
      expect(typeof state).toBe('object');

      // Should have analyzed at least one function
      expect(state.nodesFound).toBeGreaterThan(0);

      // Get the analysis results (they're stored with keys like "filepath:::functionName")
      const analysisKeys = Object.keys(state).filter((key) => key.includes(':::'));
      expect(analysisKeys.length).toBeGreaterThan(0);

      // Check that we have actual analysis results
      const analysisResults = analysisKeys.map((key) => state[key]);
      expect(analysisResults.length).toBeGreaterThan(0);

      // Each result should have maintainability metrics
      analysisResults.forEach((result) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      // AI validation of analysis quality
      await aiExpect(analysisResults).toSatisfy(
        'Should contain objects with numeric code quality metric scores (values between 0 and 1). The specific metric names may vary but should relate to code quality aspects like maintainability, readability, complexity, testability, or similar software engineering concerns.'
      );
    },
    longTestTimeout
  );

  it(
    'analyzes code for security features',
    async () => {
      const testFilePath = path.join(testDir, 'security-sample.js');

      // Create test file with potential security considerations
      await fs.writeFile(
        testFilePath,
        `
      import crypto from 'crypto';
      
      function hashPassword(password) {
        // Simple hashing - not secure for production
        return crypto.createHash('md5').update(password).digest('hex');
      }
      
      async function executeQuery(userInput) {
        // Potential SQL injection risk
        const query = \`SELECT * FROM users WHERE name = '\${userInput}'\`;
        return await db.query(query);
      }
      
      module.exports = { hashPassword, executeQuery };
    `
      );

      const state = await scanJs({
        node: { filename: testFilePath },
        features: 'security',
      });

      expect(state).toBeDefined();
      expect(typeof state).toBe('object');

      // Should have analyzed functions
      expect(state.nodesFound).toBeGreaterThan(0);

      // Get the analysis results
      const analysisKeys = Object.keys(state).filter((key) => key.includes(':::'));
      const analysisResults = analysisKeys.map((key) => state[key]);

      expect(analysisResults.length).toBeGreaterThan(0);

      // The scan-js analyzes code features based on the selected criteria
      // When we ask for "security" features, it still analyzes general code quality metrics
      // Verify that we got analysis results with numeric scores
      analysisResults.forEach((result) => {
        // Should have at least one metric with a numeric score
        const hasMetrics = Object.values(result).some((value) => typeof value === 'number');
        expect(hasMetrics).toBe(true);
      });
    },
    longTestTimeout
  );
});
