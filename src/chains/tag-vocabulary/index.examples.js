import { describe } from 'vitest';
import tagVocabulary, { generateInitialVocabulary, computeTagStatistics } from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Tag vocabulary chain');

describe('tag-vocabulary examples', () => {
  describe('generateInitialVocabulary', () => {
    it(
      'should generate expense category tags',
      async () => {
        const tagSpec = `Create a tag vocabulary for categorizing personal expenses.
      Focus on common spending categories that help with budgeting.
      Use a flat structure with about 10-12 tags.
      Make tags mutually exclusive where possible.`;

        const sampleExpenses = [
          { description: 'Whole Foods groceries', amount: 87.43 },
          { description: 'Monthly rent payment', amount: 1500.0 },
          { description: 'Netflix subscription', amount: 15.99 },
          { description: 'Gas station fill-up', amount: 45.0 },
          { description: 'Restaurant dinner with friends', amount: 67.5 },
          { description: 'Electric bill', amount: 120.0 },
          { description: 'Gym membership', amount: 40.0 },
          { description: 'Amazon Prime', amount: 14.99 },
        ];

        const vocabulary = await generateInitialVocabulary(tagSpec, sampleExpenses);

        expect(vocabulary).toHaveProperty('tags');
        expect(vocabulary.tags).toBeInstanceOf(Array);

        await aiExpect({ vocabulary, sampleExpenses, tagSpec }).toSatisfy(
          'Generated vocabulary contains appropriate expense categories for the sample expenses'
        );
      },
      longTestTimeout
    );
  });

  describe('computeTagStatistics', () => {
    it('should analyze tag distribution', () => {
      const vocabulary = {
        tags: [
          { id: 'high', label: 'High Priority' },
          { id: 'medium', label: 'Medium Priority' },
          { id: 'low', label: 'Low Priority' },
          { id: 'blocked', label: 'Blocked' },
          { id: 'waiting', label: 'Waiting' },
        ],
      };

      const taggedItems = [
        ['high'],
        ['high', 'blocked'],
        ['medium'],
        ['low'],
        ['high'],
        ['medium'],
        ['low'],
        [], // untagged item
        ['medium', 'waiting'],
        ['low'],
      ];

      // Count expected: high=3, medium=3, low=3, blocked=1, waiting=1

      const stats = computeTagStatistics(vocabulary, taggedItems, {
        topN: 2,
        bottomN: 2,
      });

      expect(stats.stats.coveragePercent).toBe(90); // 9 of 10 items tagged

      // Both 'high' and 'medium' have 3 uses, 'low' has 3 uses too
      // The sort is by count descending, so all three are tied at 3
      expect(stats.mostUsed[0].count).toBe(3);
      expect(stats.mostUsed[1].count).toBe(3);

      // Since we only request topN=2, we only get 2 tags in mostUsed
      const topTagIds = stats.mostUsed.map((t) => t.tag.id);
      expect(topTagIds).toHaveLength(2);
      // Any 2 of the 3-count tags could be returned
      const possibleTopTags = ['high', 'medium', 'low'];
      expect(possibleTopTags).toContain(topTagIds[0]);
      expect(possibleTopTags).toContain(topTagIds[1]);

      expect(stats.leastUsed.some((t) => t.tag.id === 'blocked')).toBe(true);
      expect(stats.leastUsed.some((t) => t.tag.id === 'waiting')).toBe(true);

      const untaggedProblems = stats.problematicItems.filter((p) => p.type === 'untagged');
      expect(untaggedProblems.length).toBe(1);
      expect(untaggedProblems[0].itemIndex).toBe(7);
    });
  });

  describe('full vocabulary generation with refinement', () => {
    it(
      'should generate and refine customer support ticket tags',
      async () => {
        const tickets = [
          'Cannot login to account, password reset not working',
          'How do I export my data to CSV?',
          'App crashes when uploading large files',
          'Request for bulk discount pricing',
          'Two-factor authentication not sending codes',
          'Feature request: dark mode',
          'Billing shows duplicate charge',
          'Tutorial video is outdated',
          'Integration with Slack broken',
          'Need invoice for tax purposes',
          'Performance very slow on mobile',
          'Cancel my subscription',
          'API rate limit too restrictive',
          'Missing translation for Spanish',
          'Security concern about data storage',
        ];

        const tagSpec = `Create tags for customer support ticket categorization.
      Focus on:
      - Issue type (bug, question, request, complaint)
      - Product area (authentication, billing, performance, integrations)
      - Urgency level
      Target 12-15 tags total with clear, actionable labels.`;

        // Deterministic mock tagger — pure keyword matching, no Math.random().
        // Broader keyword set ensures most items get tagged without randomness.
        const mockTagger = async (items, vocabulary) => {
          return items.map((item, itemIndex) => {
            const tags = [];
            const itemLower = item.toLowerCase();

            vocabulary.tags.forEach((tag) => {
              const tagId = tag.id.toLowerCase();
              const tagLabel = (tag.label || '').toLowerCase();
              // Match item keywords against tag id and label
              if (
                itemLower.includes('login') &&
                (tagId.includes('auth') || tagLabel.includes('auth'))
              )
                tags.push(tag.id);
              if (
                itemLower.includes('password') &&
                (tagId.includes('auth') || tagLabel.includes('auth'))
              )
                tags.push(tag.id);
              if (
                itemLower.includes('two-factor') &&
                (tagId.includes('auth') || tagId.includes('security'))
              )
                tags.push(tag.id);
              if (
                (itemLower.includes('bill') ||
                  itemLower.includes('invoice') ||
                  itemLower.includes('charge') ||
                  itemLower.includes('subscription')) &&
                (tagId.includes('bill') || tagLabel.includes('bill'))
              )
                tags.push(tag.id);
              if (
                (itemLower.includes('crash') || itemLower.includes('broken')) &&
                (tagId.includes('bug') || tagLabel.includes('bug'))
              )
                tags.push(tag.id);
              if (
                itemLower.includes('slow') &&
                (tagId.includes('performance') || tagLabel.includes('performance'))
              )
                tags.push(tag.id);
              if (
                (itemLower.includes('request') || itemLower.includes('feature')) &&
                (tagId.includes('request') ||
                  tagLabel.includes('request') ||
                  tagId.includes('feature'))
              )
                tags.push(tag.id);
              if (
                (itemLower.includes('how') ||
                  itemLower.includes('export') ||
                  itemLower.includes('tutorial')) &&
                (tagId.includes('question') ||
                  tagLabel.includes('question') ||
                  tagId.includes('doc'))
              )
                tags.push(tag.id);
              if (
                (itemLower.includes('security') || itemLower.includes('data storage')) &&
                (tagId.includes('security') || tagLabel.includes('security'))
              )
                tags.push(tag.id);
              if (
                itemLower.includes('integration') &&
                (tagId.includes('integration') || tagLabel.includes('integration'))
              )
                tags.push(tag.id);
            });

            // Deterministic fallback: assign tag based on item index
            if (tags.length === 0 && vocabulary.tags.length > 0) {
              tags.push(vocabulary.tags[itemIndex % vocabulary.tags.length].id);
            }

            return [...new Set(tags)]; // Deduplicate
          });
        };

        const finalVocabulary = await tagVocabulary(tagSpec, tickets, {
          tagger: mockTagger,
          sampleSize: 8,
        });

        expect(finalVocabulary.tags).toBeInstanceOf(Array);

        await aiExpect({ finalVocabulary, tickets, tagSpec }).toSatisfy(
          'Final vocabulary covers the different types of support tickets appropriately'
        );
      },
      longTestTimeout
    );
  });
});
