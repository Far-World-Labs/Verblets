import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import name from './index.js';
import vitestAiExpect from '../../chains/expect/index.js';
import { logSuiteStart, logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

//
// Setup AI test wrappers
//
const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'name verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'name verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'name verblet' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

//
// Test suite
//
beforeAll(async () => {
  await suiteLogStart('name verblet', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('name verblet', extractFileContext(2));
});

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
