import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import questions from './index.js';
import vitestAiExpect from '../expect/index.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Questions verblet' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Questions verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Questions verblet' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Questions verblet', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Questions verblet', extractFileContext(2));
});

const ensureDirectoryExists = async (directoryPath) => {
  try {
    await fs.access(directoryPath);
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
};

const readFileOrUndefined = async (filePath) => {
  let result;
  try {
    result = (await fs.readFile(filePath)).toString();
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // do nothing
  }
  return result;
};

const cacheDir = path.join(process.env.HOME, '.cache', 'puck');
const cacheFile = `${cacheDir}/questions-verblet-test-cache-1.json`;

const examples = [
  {
    inputs: {
      text: 'Writing a prompt toolkit for ChatGPT',
      searchBreadth: 0.5,
    },
    want: { minLength: 10 },
  },
];

describe('Questions verblet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.text,
      async () => {
        const canUseCache = process.env.RUN_TESTS_WITH_RANDOMNESS_ONCE;

        const cache = await readFileOrUndefined(cacheFile);

        let result;
        if (canUseCache && cache) {
          result = JSON.parse(cache);
        } else {
          result = await questions(example.inputs.text);
        }

        if (canUseCache) {
          await ensureDirectoryExists(cacheDir);
          await fs.writeFile(cacheFile, JSON.stringify(result));
        }

        if (example.want.minLength) {
          expect(result.length).gt(example.want.minLength);
        }
      },
      longTestTimeout
    );
  });
});
