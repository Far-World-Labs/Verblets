import { describe, expect, it } from "vitest";

import pave from "./index.js";

const examples = [
  {
    name: "Set a nested object value",
    inputs: { obj: {}, path: "a.b.c", value: 42 },
    want: { result: { a: { b: { c: 42 } } } },
  },
  {
    name: "Set a nested array value",
    inputs: { obj: [], path: "0.1.2", value: 42 },
    want: { result: [[undefined, [undefined, undefined, 42]]] },
  },
  {
    name: "Set a mixed object and array value",
    inputs: { obj: {}, path: "a.0.b", value: 42 },
    want: { result: { a: [{ b: 42 }] } },
  },
  {
    name: "Set a value on an existing object",
    inputs: { obj: { x: { y: 1 } }, path: "x.z", value: 2 },
    want: { result: { x: { y: 1, z: 2 } } },
  },
  {
    name: "Set a value on an existing array",
    inputs: { obj: [0, [1]], path: "1.2", value: 3 },
    want: { result: [0, [1, undefined, 3]] },
  },
  {
    name: "Override an existing value in an object",
    inputs: { obj: { a: { b: 1 } }, path: "a.b", value: 99 },
    want: { result: { a: { b: 99 } } },
  },
  {
    name: "Override an existing value in an array",
    inputs: { obj: [0, [1, 2]], path: "1.1", value: 99 },
    want: { result: [0, [1, 99]] },
  },
  {
    name: "Set a value with an empty path (throws)",
    inputs: { obj: { x: 1 }, path: "", value: 42 },
    want: { throws: true },
  },
  {
    name: "Set a value with an invalid path (throws)",
    inputs: { obj: { x: 1 }, path: ".", value: 42 },
    want: { throws: true },
  },
  {
    name: "Set a value with a single element path on an object",
    inputs: { obj: {}, path: "a", value: 42 },
    want: { result: { a: 42 } },
  },
];

describe("pave", () => {
  examples.forEach((example) => {
    it(example.name, () => {
      const { obj } = example.inputs;

      if (example.want.throws) {
        expect(() =>
          pave(obj, example.inputs.path, example.inputs.value)
        ).toThrow();
      } else {
        const result = pave(obj, example.inputs.path, example.inputs.value);
        expect(result).toEqual(example.want.result);
      }
    });
  });
});
