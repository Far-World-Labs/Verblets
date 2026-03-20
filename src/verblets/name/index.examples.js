import { describe } from 'vitest';

import name from './index.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

//
// Setup AI test wrappers
//
const { it, expect, aiExpect } = getTestHelpers('name verblet');

//
// Test suite
//

const examples = [
  { got: { text: 'Chat logs for customer support' }, want: 'chatSupportLogs' },
  { got: { text: 'Sensor readings from smart home devices' }, want: 'smartHomeSensorReadings' },
  {
    got: {
      text: 'Voice memos from friends sharing their hopes and worries',
    },
    want: 'voiceMemos',
  },
];

describe('name verblet', () => {
  examples.forEach((example) => {
    it(example.got.text, async () => {
      const result = await name(example.got.text);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
