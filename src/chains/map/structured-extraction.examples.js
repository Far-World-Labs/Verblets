import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import map from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { makeWrappedIt, makeWrappedExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { fakeTransactions } from './fake-transactions.js';
import { transactionBatchSchema } from './transaction-batch-schema.js';

const config = getConfig();
const suite = 'Map chain - Structured Extraction';

const it = makeWrappedIt(vitestIt, suite, config);
const expect = makeWrappedExpect(vitestExpect, suite, config);

describe('map structured extraction examples', () => {
  it(
    'should extract structured JSON from credit card transaction strings',
    async () => {
      // Use map to extract structured data
      const results = await map(
        fakeTransactions,
        `Extract structured information from this credit card transaction string.
      Parse the date, merchant name, amount (as number), location, and categorize appropriately.`,
        {
          responseFormat: transactionBatchSchema,
          batchSize: 5, // Process in batches of 5
        }
      );

      // Verify results
      expect(results).toHaveLength(fakeTransactions.length);

      // Filter out any undefined results from failed extractions
      const validResults = results.filter((r) => r != null);
      expect(validResults.length).toBeGreaterThan(0);

      validResults.forEach((result) => {
        expect(result).toHaveProperty('date');
        expect(result).toHaveProperty('merchant');
        expect(result).toHaveProperty('amount');
        expect(result).toHaveProperty('location');
        expect(result).toHaveProperty('category');

        // Verify date format
        expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Verify amount is a number
        expect(typeof result.amount).toBe('number');
        expect(result.amount).toBeGreaterThan(0);

        // Verify category is from enum
        expect([
          'food',
          'transport',
          'entertainment',
          'shopping',
          'utilities',
          'health',
          'financial',
          'other',
        ]).toContain(result.category);
      });

      // Check specific extractions if we have valid results
      if (validResults.length > 0) {
        const firstValid = validResults[0];
        if (firstValid.merchant && firstValid.merchant.includes('AMAZON')) {
          expect(firstValid.amount).toBeGreaterThan(0);
          expect(['entertainment', 'shopping', 'other']).toContain(firstValid.category);
        }
      }
    },
    longTestTimeout
  );
});
