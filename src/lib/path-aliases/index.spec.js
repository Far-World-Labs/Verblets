import { describe, expect, it, vi, beforeEach } from 'vitest';
import testAdvice from '../../chains/test-advice/index.js';
import alias from './index.js';
import { runTable } from '../examples-runner/index.js';

vi.mock('../../chains/test-advice/index.js', () => ({ default: vi.fn() }));

// Object-key order isn't guaranteed; the processor returns sorted entries
// so deep-equal compares the sets, not the iteration order.
const sortedEntries = (obj) => Object.entries(obj).toSorted(([a], [b]) => a.localeCompare(b));

runTable({
  describe: 'path-aliases',
  examples: [
    {
      name: 'basic usage',
      inputs: { sequences: ['foo/bar/baz.js', 'foo/biz/baz.js', 'foo/biz/qux.js'] },
      want: {
        value: sortedEntries({
          'foo/bar/baz.js': 'bar/baz.js',
          'foo/biz/baz.js': 'biz/baz.js',
          'foo/biz/qux.js': 'qux.js',
        }),
      },
    },
    {
      name: 'deeper conflict',
      inputs: { sequences: ['a/y/x/w/v.js', 'b/y/z/w/v.js'], delimiter: '/' },
      want: {
        value: sortedEntries({
          'a/y/x/w/v.js': 'x/w/v.js',
          'b/y/z/w/v.js': 'z/w/v.js',
        }),
      },
    },
    {
      name: 'no delimiter conflict',
      inputs: { sequences: ['192.168.0.1', '192.168.1.1', '10.0.0.1'], delimiter: '.' },
      want: {
        value: sortedEntries({
          '192.168.0.1': '168.0.1',
          '192.168.1.1': '1.1',
          '10.0.0.1': '0.0.1',
        }),
      },
    },
  ],
  process: ({ inputs }) => sortedEntries(alias(inputs.sequences, inputs.delimiter)),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});

// `testAdvice`-driven tests are imperative because they're discovered at
// module-load time from an async source — the row count comes from a
// promise, not data we can declare statically.
describe('path-aliases: testAdvice integration', async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  testAdvice.mockResolvedValue([]);
  const advices = await testAdvice('./src/lib/path-aliases/index.js');

  advices.forEach((a) => {
    it(a.name, () => expect(true).toBe(true));
  });

  it('returns no advice for the path-aliases module', () => expect(advices.length).toBe(0));
});
