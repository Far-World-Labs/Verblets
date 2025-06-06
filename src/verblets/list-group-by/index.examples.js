import { describe, it, expect } from 'vitest';
import listGroupBy from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-group-by examples', () => {
  it(
    'groups reflections by life lesson',
    async () => {
      const reflections = [
        'I missed a deadline but learned to ask for help sooner',
        'Volunteered at a shelter and felt more compassionate',
        'Admitted a difficult truth to a friend and it hurt our relationship',
        'Helped a neighbor move and felt our community grow',
      ];
      const result = await listGroupBy(
        reflections,
        'Group each entry by the life lesson it represents (humility, compassion, integrity, community)'
      );
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});
