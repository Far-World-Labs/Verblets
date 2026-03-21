import { describe } from 'vitest';
import extractFeatures from './index.js';
import map from '../map/index.js';
import { mapInstructions as scoreMapInstructions, scoreSpec } from '../score/index.js';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js'; // standard: 5-6 LLM calls
import transactions from './dummy-transactions.json';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const suite = 'Extract Features chain';

const { it, expect, aiExpect } = getTestHelpers(suite);

// Higher-order function to create test-specific loggers
const makeTestLogger = (testName) => {
  return config?.aiMode && globalThis.logger
    ? globalThis.logger.child({ suite, testName })
    : undefined;
};

// Tag vocabularies
const CATEGORY_SECTOR_TAGS = [
  // Core Living Expenses
  'core/housing',
  'core/utilities',
  'core/telecom-internet',

  // Food & Dining
  'food/groceries',
  'food/dining',
  'food/coffee-snacks',

  // Transportation
  'transport/fuel',
  'transport/transit',
  'transport/rideshare',
  'transport/parking',
  'transport/tolls',

  // Healthcare
  'health/pharmacy',
  'health/medical',
  'health/dental',
  'health/vision',

  // Insurance
  'insurance/auto',
  'insurance/home',
  'insurance/health',
  'insurance/life',

  // Shopping & Goods
  'shopping/apparel',
  'shopping/electronics',
  'shopping/home-goods',

  // Entertainment & Leisure
  'entertainment/streaming',
  'entertainment/games',
  'entertainment/events',

  // Education & Learning
  'education/tuition',
  'education/books',
  'education/courses',

  // Travel
  'travel/flights',
  'travel/lodging',
  'travel/car-rental',
  'travel/rail-bus',

  // Business & Work
  'business/saas',
  'business/cloud',
  'business/tools',
  'business/te-expense',

  // Family & Dependents
  'family/pets-food',
  'family/pets-vet',
  'family/pets-supplies',
  'family/childcare',
  'family/school-supplies',

  // Home & Property
  'property/home-improvement',

  // Financial & Government
  'finance/financial-services',
  'finance/government-taxes',

  // Digital & Online
  'digital/digital-goods',

  // Giving & Charity
  'giving/charity-donations',
];

const NECESSITY_TAGS = [
  'necessity/essential',
  'necessity/important',
  'necessity/discretionary',
  'necessity/luxury',
  'necessity/emergency',
];

const ACTION_TAGS = ['action/keep', 'action/optimize', 'action/investigate', 'action/cuttable'];

describe.skipIf(!isMediumBudget)('[medium] extract-features examples', () => {
  it(
    'should categorize and score financial transactions',
    { timeout: longTestTimeout },
    async () => {
      // Create logger for the test
      const logger = makeTestLogger('categorize financial transactions');

      // Build the spending wisdom penalty specification
      const wisdomSpec =
        await scoreSpec(`Evaluate credit/debit transaction. Output 0-10 where 0=wise/necessary, 10=poor use.
Consider: necessity, price fairness, alternatives, subscription creep, impulse indicators, utility per dollar.`);

      // Define feature extraction operations
      const features = [
        {
          name: 'amount',
          operation: (items, config) =>
            map(
              items,
              'Extract dollar amount, round to nearest dollar. Return only the number.',
              config
            ),
        },
        {
          name: 'categories',
          operation: (items, config) =>
            map(
              items,
              `For this transaction, return ALL applicable category tags as comma-separated values. 
          You can return 0, 1, 2, or more tags. Some transactions fit multiple categories.
          Return empty string "" if no tags apply.
          Available tags: ${CATEGORY_SECTOR_TAGS.join(', ')}
          
          Examples:
          - Amazon purchase might be: "shopping/electronics, digital-goods" 
          - Uber ride might be: "transport/rideshare"
          - Random fee might be: ""`,
              config
            ),
        },
        {
          name: 'necessityTags',
          operation: (items, config) =>
            map(
              items,
              `Return ALL applicable necessity tags (0 to many, comma-separated).
          A purchase might be both essential AND emergency. Return "" if none apply.
          Available: ${NECESSITY_TAGS.join(', ')}`,
              config
            ),
        },
        {
          name: 'actionTags',
          operation: (items, config) =>
            map(
              items,
              `Return ALL applicable action recommendations (0 to many, comma-separated).
          Return "" if no actions needed.
          Available: ${ACTION_TAGS.join(', ')}
          
          IMPORTANT CONSTRAINTS: 
          - action/optimize: at most 10% of items (only clearest optimization opportunities)
          - action/investigate: at most 10% of items (only most suspicious/unclear transactions)
          - Most items should receive neither of these tags
          - action/keep and action/cuttable can be used more liberally`,
              config
            ),
        },
        {
          name: 'wisdomPenalty',
          operation: (items, config) =>
            map(items, scoreMapInstructions({ specification: wisdomSpec }), config),
        },
      ];

      // Extract features
      const results = await extractFeatures(transactions, features, { logger });

      // Basic structure check
      expect(results).toHaveLength(transactions.length);

      // Verify all results have the expected properties
      results.forEach((result) => {
        expect(result).toHaveProperty('amount');
        expect(result).toHaveProperty('categories');
        expect(result).toHaveProperty('necessityTags');
        expect(result).toHaveProperty('actionTags');
        expect(result).toHaveProperty('wisdomPenalty');
      });

      // AI-based assertion on overall categorization quality
      // Individual feature extractions may have occasional empty or imprecise values
      // due to LLM non-determinism, so we validate the overall pattern in one assertion.
      await aiExpect(results).toSatisfy(
        'Looking at the overall results: most transactions have reasonable category tags assigned (e.g., entertainment for streaming, food for grocery stores, business for cloud/SaaS), amounts are extracted as numbers, and wisdom penalty scores are numeric values between 0 and 10'
      );
    }
  );
});
