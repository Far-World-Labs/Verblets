import { beforeAll, afterAll } from 'vitest';
import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import scanJs from './index.js';
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
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Scan-js chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Scan-js chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Scan-js chain' } })
  : vitestAiExpect;

describe('scan-js chain', () => {
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
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
      const hasValidAnalysis = await aiExpect(analysisResults).toSatisfy(
        'Should contain code quality metrics like separationOfConcerns, singlePurpose, or easyTestability scores'
      );
      expect(hasValidAnalysis).toBe(true);
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
