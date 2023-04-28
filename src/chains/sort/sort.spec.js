import { describe, expect, it, vi } from 'vitest';
import * as R from 'ramda';

import sort, { useTestSortPrompt } from './index.js';

useTestSortPrompt();

const extremeK = 4;
const chunkSize = 12;
const byAB = (a, b) => b.localeCompare(a);

const unsortedStrings = [
  'zebra',
  'apple',
  'quail',
  'mango',
  'giraffe',
  'banana',
  'dog',
  'lion',
  'tiger',
  'elephant',
  'kiwi',
  'raspberry',
  'grape',
  'apricot',
  'kangaroo',
  'owl',
  'peacock',
  'xenon',
  'uranium',
  'platinum',
  'walrus',
  'fox',
  'capybara',
  'iguana',
  'jaguar',
  'koi',
  'lobster',
  'moose',
  'nugget',
  'octopus',
  'python',
  'quokka',
  'raccoon',
  'starfish',
  'tortoise',
  'umbrella',
  'vulture',
  'wombat',
  'xerus',
  'yak',
  'zeppelin',
  'ant',
  'beaver',
  'cat',
  'dolphin',
  'echidna',
  'frog',
  'hamster',
  'impala',
  'jellyfish',
];

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (text.options.description === 'alphabetically') {
      const sorted = R.sort((a, b) => b.localeCompare(a), text.list);
      return JSON.stringify(sorted);
    }
    return '[]';
  }),
}));

vi.mock('../../lib/budget-tokens/index.js', () => ({
  default: vi.fn().mockImplementation(() => 0),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      options: { by: 'alphabetically', iterations: 3, extremeK, chunkSize },
      list: [...unsortedStrings],
    },
    want: {
      highest: R.sort(byAB, [...unsortedStrings]).slice(0, extremeK * 3),
      lowest: R.sort(byAB, [...unsortedStrings]).slice(-(extremeK * 3)),
    },
  },
  {
    name: 'Empty list',
    inputs: {
      options: { by: 'alphabetically', extremeK, chunkSize },
      list: [],
    },
    want: {
      highest: [],
      lowest: [],
    },
  },
];

describe('Sort', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const iterations = example.inputs.options.iterations ?? 1;
      const result = await sort(example.inputs.options, example.inputs.list);
      expect(result.slice(0, extremeK * iterations)).toStrictEqual(
        example.want.highest
      );
      expect(result.slice(-(extremeK * iterations))).toStrictEqual(
        example.want.lowest
      );
    });
  });
});
