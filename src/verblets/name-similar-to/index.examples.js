import { describe, expect, it } from 'vitest';
import nameSimilarTo from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('nameSimilarTo examples', () => {
  it(
    'suggests a matching name',
    async () => {
      const result = await nameSimilarTo('record of coffee tasting notes', [
        'BeanDiary',
        'RoastLog',
        'BrewIndex',
      ]);
      expect(typeof result).toBe('string');
    },
    longTestTimeout
  );
});
