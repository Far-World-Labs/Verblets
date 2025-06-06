import { describe, expect, it } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import name from './index.js';

const examples = [
  { inputs: { text: 'Chat logs for customer support' } },
  { inputs: { text: 'Sensor readings from smart home devices' } },
  {
    inputs: {
      text: 'Voice memos from friends sharing their hopes and worries',
    },
  },
];

describe('name verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        const result = await name(example.inputs.text);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      },
      longTestTimeout
    );
  });
});
