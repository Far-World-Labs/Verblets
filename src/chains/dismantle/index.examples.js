import { describe } from 'vitest';

import Dismantle from './index.js';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js'; // standard: 3 LLM calls
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Dismantle chain');

describe('Dismantle chain', () => {
  it.skipIf(!isMediumBudget)(
    '[medium] 2022 Aprilia Tuono 660',
    async () => {
      const dismantleBike = new Dismantle('2022 Aprilia Tuono 660', {
        enhanceFixes: `
 - IMPORTANT If the component is "Electronics", output empty results.
 - If the component is "Dashboard", output empty results.
`,
      });
      await dismantleBike.makeSubtree({ depth: 1 });
      await dismantleBike.attachSubtree({
        depth: 1,
        find: (node) => node.name === 'Fuel Injector',
      });
      await dismantleBike.attachSubtree({
        depth: 1,
        find: (node) => node.name === 'Exhaust System',
      });

      expect(dismantleBike.tree.children.length).toBeGreaterThan(0);
      await aiExpect(dismantleBike.tree.children.map((c) => c.name)).toSatisfy(
        'motorcycle component names relevant to a 2022 Aprilia Tuono 660'
      );
    },
    longTestTimeout
  );
});
