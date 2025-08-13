import { describe, expect as vitestExpect, it as vitestIt, afterAll } from 'vitest';
import detectPatterns from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Detect patterns chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Detect patterns chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Detect patterns chain' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Detect patterns chain', extractFileContext(2));
});

describe('detect-patterns examples', () => {
  it(
    'should detect patterns in user settings objects',
    async () => {
      const userSettings = [
        { theme: 'dark', fontSize: 14, autoSave: true, language: 'en' },
        { theme: 'light', fontSize: 12, autoSave: false, language: 'en' },
        { theme: 'dark', fontSize: 16, autoSave: true, language: 'es' },
        { theme: 'dark', fontSize: 14, autoSave: true, language: 'fr' },
        { theme: 'light', fontSize: 12, autoSave: false, language: 'en' },
        { theme: 'system', fontSize: 14, autoSave: true, language: 'en' },
        { theme: 'dark', fontSize: 18, autoSave: true, language: 'en' },
        { theme: 'light', fontSize: 10, autoSave: false, language: 'de' },
      ];

      const patterns = await detectPatterns(userSettings, {
        topN: 3,
        candidateWindow: 15,
      });

      expect(patterns).to.be.an('array');
      expect(patterns.length).to.be.at.most(3);

      // Should find patterns like dark theme with auto-save, light theme without auto-save

      // AI assertion to validate detected patterns make sense
      await aiExpect({
        data: 'user settings with themes, font sizes, auto-save, and languages',
        patterns,
      }).toSatisfy(
        'Do these patterns reveal meaningful correlations in user preferences (e.g., dark theme users preferring auto-save)?'
      );

      // AI assertion to validate pattern quality
      await aiExpect(
        `Detected ${patterns.length} patterns from ${userSettings.length} user settings`
      ).toSatisfy('Is this a reasonable number of patterns for identifying user behavior trends?');
    },
    longTestTimeout
  );

  it(
    'should detect patterns in e-commerce product configurations',
    async () => {
      const products = [
        { category: 'electronics', price: 299, inStock: true, shipping: 'free', rating: 4.5 },
        { category: 'electronics', price: 199, inStock: false, shipping: 'paid', rating: 4.2 },
        { category: 'books', price: 15, inStock: true, shipping: 'free', rating: 4.8 },
        { category: 'books', price: 12, inStock: true, shipping: 'free', rating: 4.6 },
        { category: 'electronics', price: 599, inStock: true, shipping: 'free', rating: 4.7 },
        { category: 'clothing', price: 45, inStock: true, shipping: 'paid', rating: 4.1 },
        { category: 'clothing', price: 35, inStock: false, shipping: 'paid', rating: 3.9 },
        { category: 'books', price: 18, inStock: true, shipping: 'free', rating: 4.9 },
      ];

      const patterns = await detectPatterns(products, {
        topN: 2,
        candidateWindow: 10,
      });

      expect(patterns).to.be.an('array');
      expect(patterns.length).to.be.equal(2);

      // AI assertion to validate e-commerce patterns
      await aiExpect({
        data: 'product configurations with categories, prices, stock status, shipping, and ratings',
        patterns,
      }).toSatisfy(
        'Do these patterns identify meaningful relationships in product data (e.g., electronics with higher prices, books with free shipping)?'
      );

      // AI assertion for pattern insights
      await aiExpect(
        `Found patterns in ${products.length} products across electronics, books, and clothing categories`
      ).toSatisfy('Are these patterns useful for understanding product inventory characteristics?');
    },
    longTestTimeout
  );
});
