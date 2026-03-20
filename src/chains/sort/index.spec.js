import { describe, expect, it, vi } from 'vitest';

import sort, { useTestSortPrompt, mapEffort } from './index.js';

useTestSortPrompt();

const extremeK = 4;
const batchSize = 12;
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

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (text.options.description === 'alphabetically') {
      const sorted = text.list.toSorted((a, b) => b.localeCompare(a));
      return JSON.stringify(sorted);
    }
    return '[]';
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      options: { by: 'alphabetically', iterations: 3, extremeK, batchSize },
      list: [...unsortedStrings],
    },
    want: {
      highest: unsortedStrings.toSorted(byAB).slice(0, extremeK * 3),
      lowest: unsortedStrings.toSorted(byAB).slice(-(extremeK * 3)),
    },
  },
  {
    name: 'Empty list',
    inputs: {
      options: { by: 'alphabetically', extremeK, batchSize },
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
      const result = await sort(example.inputs.list, example.inputs.options.by, {
        model: { budgetTokens: () => ({ completion: 0 }) },
        ...example.inputs.options,
      });
      expect(result.slice(0, extremeK * iterations)).toStrictEqual(example.want.highest);
      expect(result.slice(-(extremeK * iterations))).toStrictEqual(example.want.lowest);
    });
  });
});

describe('mapEffort', () => {
  it('all levels return same shape', () => {
    const keys = ['low', 'med', 'high'].map((l) => Object.keys(mapEffort(l)).sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[1]).toEqual(keys[2]);
  });

  it('undefined returns default', () => {
    expect(mapEffort(undefined)).toBeDefined();
    expect(typeof mapEffort(undefined)).toBe('object');
  });

  it('passes through object for power consumers', () => {
    const custom = { a: 1, b: 2 };
    expect(mapEffort(custom)).toBe(custom);
  });

  it('unknown string falls back to default', () => {
    expect(mapEffort('zzz')).toEqual(mapEffort(undefined));
  });
});
