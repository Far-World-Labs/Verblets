import { describe } from 'vitest';
import tagItem, { mapTags, tagSpec, tagInstructions } from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Tags chain');

describe('tags examples', () => {
  const expenseVocabulary = {
    tags: [
      { id: 'food', label: 'Food & Dining', description: 'Groceries, restaurants, coffee' },
      { id: 'transport', label: 'Transportation', description: 'Gas, public transit, rideshare' },
      { id: 'housing', label: 'Housing', description: 'Rent, mortgage, utilities' },
      { id: 'entertainment', label: 'Entertainment', description: 'Movies, games, streaming' },
      { id: 'health', label: 'Health', description: 'Medical, pharmacy, fitness' },
      { id: 'shopping', label: 'Shopping', description: 'Clothing, household items' },
      { id: 'bills', label: 'Bills & Utilities', description: 'Recurring monthly bills' },
      { id: 'savings', label: 'Savings', description: 'Investments, emergency fund' },
    ],
  };

  describe('tagItem - single item tagging', () => {
    it(
      'should tag individual expense transactions',
      async () => {
        const transaction = {
          description: 'Whole Foods Market',
          amount: 127.43,
          date: '2024-01-15',
        };

        const tags = await tagItem(transaction, {
          text: 'Tag this expense based on the merchant and description',
          vocabulary: expenseVocabulary,
        });

        expect(tags).toBeInstanceOf(Array);
        const validTags = expenseVocabulary.tags.map((t) => t.id);
        await aiExpect({ result: tags, validTags, item: transaction }).toSatisfy(
          'Whole Foods transaction tagged with valid expense category'
        );
      },
      longTestTimeout
    );
  });

  describe('mapTags - batch tagging', () => {
    it(
      'should tag multiple transactions efficiently',
      async () => {
        const transactions = [
          { description: 'Shell Gas Station', amount: 45.0 },
          { description: 'Netflix Monthly', amount: 15.99 },
          { description: 'Trader Joes', amount: 67.23 },
          { description: 'Planet Fitness', amount: 10.0 },
          { description: 'Uber ride to airport', amount: 35.5 },
        ];

        const tagResults = await mapTags(transactions, {
          text: 'Categorize each transaction by its primary expense type',
          vocabulary: expenseVocabulary,
        });

        expect(tagResults).toHaveLength(5);

        const validTags = expenseVocabulary.tags.map((t) => t.id);

        // Validate all tags are from the vocabulary
        for (const tags of tagResults) {
          expect(tags).toBeInstanceOf(Array);
          tags.forEach((tag) => expect(validTags).toContain(tag));
        }
      },
      longTestTimeout
    );
  });

  describe('tagInstructions with mapTags', () => {
    it(
      'should tag tasks with pre-generated spec via instruction bundle',
      async () => {
        const projectVocabulary = {
          tags: [
            { id: 'frontend', label: 'Frontend', description: 'UI, React, CSS' },
            { id: 'backend', label: 'Backend', description: 'APIs, databases, servers' },
            { id: 'devops', label: 'DevOps', description: 'CI/CD, deployment, monitoring' },
            { id: 'testing', label: 'Testing', description: 'Unit tests, integration tests' },
            { id: 'docs', label: 'Documentation', description: 'README, API docs, guides' },
            { id: 'bug', label: 'Bug Fix', description: 'Fixing defects' },
            { id: 'feature', label: 'Feature', description: 'New functionality' },
            { id: 'refactor', label: 'Refactoring', description: 'Code improvements' },
          ],
        };

        const spec = await tagSpec('Identify the development area and work type');
        const instructions = tagInstructions({ spec, vocabulary: projectVocabulary });

        const tasks = [
          'Add unit tests for user service',
          'Update API documentation for v2 endpoints',
          'Deploy to staging environment',
          'Refactor database connection pooling',
        ];

        const tagsBatch = await mapTags(tasks, {
          ...instructions,
          vocabulary: projectVocabulary,
        });

        const validTags = projectVocabulary.tags.map((t) => t.id);
        expect(tagsBatch).toHaveLength(4);
        for (const tags of tagsBatch) {
          expect(tags).toBeInstanceOf(Array);
          tags.forEach((tag) => expect(validTags).toContain(tag));
        }
      },
      longTestTimeout
    );
  });

  describe('mapTags with instruction string', () => {
    it(
      'should tag feedback by sentiment and intent',
      async () => {
        const sentimentVocabulary = {
          tags: [
            { id: 'positive', label: 'Positive', description: 'Positive sentiment' },
            { id: 'negative', label: 'Negative', description: 'Negative sentiment' },
            { id: 'neutral', label: 'Neutral', description: 'Neutral or mixed' },
            { id: 'question', label: 'Question', description: 'Asking for information' },
            { id: 'complaint', label: 'Complaint', description: 'Expressing dissatisfaction' },
            { id: 'praise', label: 'Praise', description: 'Expressing satisfaction' },
          ],
        };

        const feedback = [
          'Your product is amazing! Best purchase ever!',
          'How do I reset my password?',
          'The app keeps crashing and support is not responding. Very frustrated.',
          'Thanks for the quick delivery.',
        ];

        const results = await mapTags(feedback, {
          text: `Analyze the sentiment and intent of customer feedback.
          Tag both the emotional tone (positive/negative/neutral) and the intent (question/complaint/praise).
          Multiple tags are expected.`,
          vocabulary: sentimentVocabulary,
        });

        const validTags = sentimentVocabulary.tags.map((t) => t.id);
        for (const tags of results) {
          expect(tags).toBeInstanceOf(Array);
          tags.forEach((tag) => expect(validTags).toContain(tag));
        }
      },
      longTestTimeout
    );
  });

  describe('tag specification generation', () => {
    it(
      'should generate clear tagging criteria',
      async () => {
        const instructions = `Tag customer emails by:
          1. Primary topic (order, shipping, return, technical)
          2. Urgency (needs immediate response vs can wait)
          3. Customer status if mentioned (new, returning, VIP)
          Allow multiple tags but require at least one topic tag.`;

        const spec = await tagSpec(instructions);

        expect(spec).toBeTruthy();
        expect(spec.length).toBeGreaterThan(50);
        expect(spec.toLowerCase()).toMatch(/topic|urgency|customer/);
      },
      longTestTimeout
    );
  });
});
