import { describe, expect, it } from 'vitest';
import themes from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('themes chain', () => {
  it(
    'maps themes to sentences',
    async () => {
      const text = `When the rain finally stopped, neighbors emerged to help one another. They shared food and repaired homes, turning hardship into solidarity.`;
      const result = await themes(text, { sentenceMap: true });
      expect(Array.isArray(result.themes)).toBe(true);
      expect(Array.isArray(result.sentenceThemes)).toBe(true);
    },
    longTestTimeout
  );
});
