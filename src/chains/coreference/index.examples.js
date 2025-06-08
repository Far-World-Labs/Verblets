import { describe, it, expect } from 'vitest';
import coreference from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('coreference example', () => {
  it(
    'basic example',
    async () => {
      const text = 'Alice gave Bob her notebook. He thanked her for it.';
      const result = await coreference(text);
      expect(Array.isArray(result)).toBe(true);
    },
    longTestTimeout
  );
});
