import { describe } from 'vitest';
import name from './index.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('name verblet');

const examples = [
  'Chat logs for customer support',
  'Sensor readings from smart home devices',
  'Voice memos from friends sharing their hopes and worries',
];

describe('name verblet', () => {
  examples.forEach((text) => {
    it(text, async () => {
      const result = await name(text);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      await aiExpect(result).toSatisfy(`a concise, memorable name that relates to: "${text}"`);
    });
  });
});
