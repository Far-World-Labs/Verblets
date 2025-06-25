import { describe, expect, it } from 'vitest';
import join from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { aiExpect } from '../expect/index.js';

describe('join examples', () => {
  it(
    'joins fragments with bulk processing',
    async () => {
      const fragments = [
        'The sun sets behind the mountains.',
        'A gentle breeze rustles through the trees.',
        'The moon rises slowly above the treeline.',
      ];
      const result = await join(fragments, 'Connect these fragments with natural transitions', {
        chunkSize: 2,
      });

      // Check for key words from each fragment rather than exact matches
      const keyWords = [
        ['sun', 'sets', 'mountains'],
        ['breeze', 'rustles', 'trees'],
        ['moon', 'rises', 'treeline'],
      ];

      const containsKeyContent = keyWords.every((words) =>
        words.some((word) => result.toLowerCase().includes(word.toLowerCase()))
      );

      const hasReasonableLength = result.length > fragments.join(' ').length * 0.7;

      expect(typeof result).toBe('string');
      expect(containsKeyContent).toBe(true);
      expect(hasReasonableLength).toBe(true);

      // AI validation for coherence and flow
      await aiExpect(result).toSatisfy(
        'This text flows naturally and connects sunset, breeze, and moonrise in a poetic way',
        { throws: false }
      );
    },
    longTestTimeout
  );

  it(
    'joins technical documentation with bulk processing',
    async () => {
      const fragments = [
        'Install the package using npm install.',
        'Import the function in your code.',
        'Configure the required environment variables.',
        'Initialize the service with your API key.',
        'Call the function with your parameters.',
        'Handle the returned promise appropriately.',
      ];
      const result = await join(
        fragments,
        'Connect these instructions with appropriate transitions',
        { chunkSize: 2 }
      );

      // Check for key technical terms from each fragment
      const keyTerms = [
        ['install', 'package', 'npm'],
        ['import', 'function', 'code'],
        ['configure', 'environment', 'variables'],
        ['initialize', 'service', 'api', 'key'],
        ['call', 'function', 'parameters'],
        ['handle', 'promise', 'returned'],
      ];

      const containsKeyContent = keyTerms.every((terms) =>
        terms.some((term) => result.toLowerCase().includes(term.toLowerCase()))
      );

      const hasInstallReference = result.toLowerCase().includes('install');

      expect(typeof result).toBe('string');
      expect(containsKeyContent).toBe(true);
      expect(hasInstallReference).toBe(true);

      // AI validation for technical documentation quality
      await aiExpect(result).toSatisfy(
        'This reads like coherent technical documentation with logical step-by-step instructions',
        { throws: false }
      );
    },
    longTestTimeout
  );

  it(
    'transforms final result with custom function',
    async () => {
      const fragments = ['Hello', 'world', 'today', 'is', 'sunny'];
      const rawResult = await join(fragments, 'Connect these words into a natural sentence', {
        chunkSize: 2,
      });
      const result = `[${rawResult}]`; // Apply transformation after join

      const hasProperBrackets = result.startsWith('[') && result.endsWith(']');
      const containsWords = fragments.every((word) =>
        result.toLowerCase().includes(word.toLowerCase())
      );

      expect(hasProperBrackets).toBe(true);
      expect(containsWords).toBe(true);

      // AI validation for sentence quality
      await aiExpect(rawResult).toSatisfy(
        'This forms a natural, grammatically correct sentence using the given words',
        { throws: false }
      );
    },
    longTestTimeout
  );

  it(
    'handles empty and single item lists',
    async () => {
      const emptyResult = await join([]);
      const singleResult = await join(['Only item']);

      expect(emptyResult).toBe('');
      expect(singleResult).toBe('Only item');
    },
    longTestTimeout
  );

  it(
    'processes longer lists with bulk operations',
    async () => {
      const aiTopics = [
        'Machine learning algorithms analyze data.',
        'Neural networks process information.',
        'Deep learning mimics brain structure.',
        'Computer vision interprets images.',
        'Natural language processing understands text.',
        'Reinforcement learning learns through trial.',
        'Data preprocessing cleans information.',
        'Model validation ensures accuracy.',
      ];

      const result = await join(aiTopics, 'Create connected text about AI topics', {
        chunkSize: 3,
      });

      const containsMostFragments =
        aiTopics.filter(
          (topic) =>
            result.includes(topic.replace('.', '')) ||
            topic.split(' ').some((word) => word.length > 4 && result.includes(word))
        ).length >= 6;

      const hasReasonableLength = result.length > 200;

      expect(typeof result).toBe('string');
      expect(containsMostFragments).toBe(true);
      expect(hasReasonableLength).toBe(true);

      // AI validation for comprehensive AI topic coverage
      await aiExpect(result).toSatisfy(
        'This text comprehensively covers multiple AI topics with smooth transitions and maintains technical accuracy',
        { throws: false }
      );
    },
    longTestTimeout
  );
});
