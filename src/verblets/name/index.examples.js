import { describe, expect, it } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import name from './index.js';

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
    it(
      example.got.text,
      async () => {
        const result = await name(example.got.text);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      },
      longTestTimeout
    );
  });
});
