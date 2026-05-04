import pave from './index.js';
import { runTable } from '../examples-runner/index.js';

// Reference migration to the table-driven runner. The previous pattern (an
// `examples = [{ name, inputs, want: { result | throws } }]` array driven by
// a `forEach` + inline `it`) was already 95% in target shape; this version
// drops the imperative scaffolding and lets `runTable` dispatch every row.
//
// `want` is the literal expected return value (deep-equal). For error cases
// we use `{ throws: true }` — the runner accepts that shape directly.

const examples = [
  {
    name: 'set a nested object value',
    inputs: { obj: {}, path: 'a.b.c', value: 42 },
    want: { a: { b: { c: 42 } } },
  },
  {
    name: 'set a nested array value',
    inputs: { obj: [], path: '0.1.2', value: 42 },
    want: [[undefined, [undefined, undefined, 42]]],
  },
  {
    name: 'set a mixed object and array value',
    inputs: { obj: {}, path: 'a.0.b', value: 42 },
    want: { a: [{ b: 42 }] },
  },
  {
    name: 'set a value on an existing object',
    inputs: { obj: { x: { y: 1 } }, path: 'x.z', value: 2 },
    want: { x: { y: 1, z: 2 } },
  },
  {
    name: 'set a value on an existing array',
    inputs: { obj: [0, [1]], path: '1.2', value: 3 },
    want: [0, [1, undefined, 3]],
  },
  {
    name: 'override an existing value in an object',
    inputs: { obj: { a: { b: 1 } }, path: 'a.b', value: 99 },
    want: { a: { b: 99 } },
  },
  {
    name: 'override an existing value in an array',
    inputs: { obj: [0, [1, 2]], path: '1.1', value: 99 },
    want: [0, [1, 99]],
  },
  {
    name: 'throws on an empty path',
    inputs: { obj: { x: 1 }, path: '', value: 42 },
    want: { throws: true },
  },
  {
    name: 'throws on an invalid path',
    inputs: { obj: { x: 1 }, path: '.', value: 42 },
    want: { throws: true },
  },
  {
    name: 'set a value with a single-element path on an object',
    inputs: { obj: {}, path: 'a', value: 42 },
    want: { a: 42 },
  },
  {
    name: 'handle numeric-like string keys',
    inputs: { obj: {}, path: 'a.1b.c', value: 42 },
    want: { a: { '1b': { c: 42 } } },
  },
];

const process = ({ obj, path, value }) => pave(obj, path, value);

runTable({ describe: 'pave', examples, process });
