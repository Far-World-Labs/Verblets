import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import tags, { tagItem, mapTags, createTagger, createTagExtractor, tagSpec } from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import {
  makeWrappedIt,
  makeWrappedExpect,
  makeWrappedAiExpect,
} from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const suite = 'Tags chain';

const it = makeWrappedIt(vitestIt, suite, config);
const expect = makeWrappedExpect(vitestExpect, suite, config);
const aiExpect = makeWrappedAiExpect(vitestAiExpect, suite, config);

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

        const instructions = 'Tag this expense based on the merchant and description';
        const tags = await tagItem(transaction, instructions, expenseVocabulary);

        expect(tags).toBeInstanceOf(Array);
        const validTags = expenseVocabulary.tags.map((t) => t.id);
        await aiExpect({ result: tags, validTags, item: transaction }).toSatisfy(
          'Whole Foods transaction tagged with valid expense category'
        );
      },
      longTestTimeout
    );

    it(
      'should handle multiple applicable tags',
      async () => {
        const transaction = {
          description: 'ComEd Electric Bill Payment',
          amount: 89.5,
          date: '2024-01-01',
        };

        const instructions = 'Assign all applicable expense categories';
        const tags = await tagItem(transaction, instructions, expenseVocabulary);

        expect(tags).toBeInstanceOf(Array);
        const validTags = expenseVocabulary.tags.map((t) => t.id);
        await aiExpect({ result: tags, validTags, item: transaction }).toSatisfy(
          'Electric bill transaction tagged with valid expense category'
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

        const instructions = 'Categorize each transaction by its primary expense type';
        const tagResults = await mapTags(transactions, instructions, expenseVocabulary);

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

  describe('createTagger - vocabulary-bound tagger', () => {
    it(
      'should create reusable tagger for consistent categorization',
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

        const projectTagger = createTagger(projectVocabulary);

        // Tag single task
        const task1 = 'Fix responsive layout issues on mobile devices';
        const tags1 = await projectTagger(task1, 'Identify the development area and work type');

        const validTags = projectVocabulary.tags.map((t) => t.id);
        expect(tags1).toBeInstanceOf(Array);
        tags1.forEach((tag) => expect(validTags).toContain(tag));

        // Tag multiple tasks
        const tasks = [
          'Add unit tests for user service',
          'Update API documentation for v2 endpoints',
          'Deploy to staging environment',
          'Refactor database connection pooling',
        ];

        const tagsBatch = await projectTagger(tasks, 'Categorize each task by area and type');

        expect(tagsBatch).toHaveLength(4);
        for (const tags of tagsBatch) {
          expect(tags).toBeInstanceOf(Array);
          tags.forEach((tag) => expect(validTags).toContain(tag));
        }
      },
      longTestTimeout
    );
  });

  describe('createTagExtractor - pre-configured extractor', () => {
    it(
      'should create optimized extractor with fixed specification',
      async () => {
        const priorityVocabulary = {
          tags: [
            { id: 'p0', label: 'P0 - Critical', description: 'System down, data loss risk' },
            {
              id: 'p1',
              label: 'P1 - High',
              description: 'Major feature broken, many users affected',
            },
            { id: 'p2', label: 'P2 - Medium', description: 'Important but workaround exists' },
            { id: 'p3', label: 'P3 - Low', description: 'Nice to have, minor issue' },
          ],
        };

        const spec = await tagSpec(`Assign priority based on:
          - User impact (how many affected)
          - Severity (data loss, feature availability)
          - Business criticality
          Only assign ONE priority tag per item.`);

        const priorityExtractor = createTagExtractor(spec, priorityVocabulary);

        const issues = [
          'Database backup job failing silently',
          'Typo in footer copyright year',
          'Login system completely broken for all users',
          'Export feature generates corrupted files for some users',
        ];

        const validPriorities = priorityVocabulary.tags.map((t) => t.id);
        for (const issue of issues) {
          const priority = await priorityExtractor(issue);

          expect(priority).toHaveLength(1); // Only one priority
          expect(validPriorities).toContain(priority[0]);
        }

        // Check specification is accessible
        expect(priorityExtractor.specification).toBe(spec);
        expect(priorityExtractor.vocabulary).toBe(priorityVocabulary);
      },
      longTestTimeout
    );
  });

  describe('stateless tagger with instructions', () => {
    it(
      'should create instruction-bound tagger',
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

        const sentimentTagger = tags(`Analyze the sentiment and intent of customer feedback.
          Tag both the emotional tone (positive/negative/neutral) and the intent (question/complaint/praise).
          Multiple tags are expected.`);

        const feedback = [
          'Your product is amazing! Best purchase ever!',
          'How do I reset my password?',
          'The app keeps crashing and support is not responding. Very frustrated.',
          'Thanks for the quick delivery.',
        ];

        const results = await sentimentTagger(feedback, sentimentVocabulary);

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
