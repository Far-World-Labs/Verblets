import fs from 'fs/promises';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

const ensureDirectoryExists = async (directoryPath) => {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
};

const readFileOrUndefined = async (filePath) => {
  let result
  try {
    result = (await fs.readFile(filePath)).toString();
  } catch (error) {

  };
  return result;
};

import { longTestTimeout } from '../../constants/common.js';
import questions from './index.js';

const cacheDir = path.join(process.env.HOME, '.cache', 'puck');
const cacheFile = `${cacheDir}/questions-verblet-test-cache-1.json`;

const examples = [
  {
    inputs: {
      text: 'Writing a prompt toolkit for ChatGPT',
      searchBreadth: 0.5,
    },
    want: { minLength: 10 }
  }
];

describe('Questions verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
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
        expect(result.length)
          .gt(example.want.minLength);
      }
    }, longTestTimeout);
  });
})
