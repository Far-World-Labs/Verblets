import * as R from 'ramda';
import { describe, expect, it, vi } from 'vitest';

import testAdvice from '../../chains/test-advice/index.js';
import { longTestTimeout } from '../../constants/common.js';
import alias from './index.js';

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      sequences: ['foo/bar/baz.js', 'foo/biz/baz.js', 'foo/biz/qux.js'],
      delimiter: '/',
    },
    want: {
      'foo/bar/baz.js': 'bar/baz.js',
      'foo/biz/baz.js': 'biz/baz.js',
      'foo/biz/qux.js': 'qux.js',
    },
  },
  {
    name: 'Deeper conflict',
    inputs: {
      sequences: ['a/y/x/w/v.js', 'b/y/z/w/v.js'],
      delimiter: '/',
    },
    want: {
      'a/y/x/w/v.js': 'x/w/v.js',
      'b/y/z/w/v.js': 'z/w/v.js',
    },
  },
  {
    name: 'No delimiter conflict',
    inputs: {
      sequences: ['192.168.0.1', '192.168.1.1', '10.0.0.1'],
      delimiter: '.',
    },
    want: {
      '192.168.0.1': '168.0.1',
      '192.168.1.1': '1.1',
      '10.0.0.1': '0.0.1',
    },
  },
];

describe('Path aliases', async () => {

  examples.forEach((example) => {
    it(example.name, () => {
      const got = alias(example.inputs.sequences, example.inputs.delimiter);
      const gotSorted = R.sort(([k1], [k2]) => k1.localeCompare(k2), Object.entries(got));
      const wantSorted = R.sort(([k1], [k2]) => k1.localeCompare(k2), Object.entries(example.want));

      expect(gotSorted).toStrictEqual(wantSorted);
    });
  });
}, longTestTimeout);

describe('Path aliases - advice', async () => {
  const advices = await testAdvice('./src/lib/path-aliases/index.js');

  advices.forEach((a) => {
    it(a.name, () => expect(true).toBe(true));
  });

  it('Trigger failure', () => expect(advices.length).toBe(0));

}, longTestTimeout);
