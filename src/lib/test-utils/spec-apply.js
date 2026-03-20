import { describe, expect, it } from 'vitest';

/**
 * Test the spec/apply/factory pattern used by score, scale, tags, entities, relations.
 *
 * Pattern: specFn(instructions) → spec, applyFn(item, spec) → result, createFn(spec) → reusable fn
 *
 * @param {Object} fns - The functions under test
 * @param {Function} fns.specFn - Generates a spec from instructions (async, calls LLM)
 * @param {Function} fns.applyFn - Applies a spec to a single item (async, calls LLM)
 * @param {Function} [fns.createFn] - Creates a reusable function from a spec (sync)
 * @param {Object} options
 * @param {Function} options.llmMock - The mocked LLM default export (vi.fn())
 * @param {*} options.mockSpec - A mock spec value to use
 * @param {*} options.mockResult - A mock result value for applyFn
 * @param {string} options.specPromptContains - String expected in specFn's LLM prompt
 * @param {string} options.applyPromptContains - String expected in applyFn's LLM prompt
 * @param {string} [options.label] - Describe block label (default: 'spec/apply pattern')
 * @param {*[]} [options.applyExtraArgs] - Extra args after (item, spec) for applyFn
 */
export function testSpecApply(
  fns,
  {
    llmMock,
    mockSpec,
    mockResult,
    specPromptContains,
    applyPromptContains,
    label = 'spec/apply pattern',
    applyExtraArgs = [],
  }
) {
  describe(label, () => {
    describe('specFn', () => {
      it('generates specification via LLM', async () => {
        llmMock.mockResolvedValueOnce(mockSpec);

        const spec = await fns.specFn('test instructions');

        expect(llmMock).toHaveBeenCalledWith(
          expect.stringContaining(specPromptContains),
          expect.any(Object)
        );
        expect(spec).toEqual(mockSpec);
      });
    });

    describe('applyFn', () => {
      it('applies spec to item via LLM', async () => {
        llmMock.mockResolvedValueOnce(mockResult);

        const result = await fns.applyFn('test item', mockSpec, ...applyExtraArgs);

        expect(llmMock).toHaveBeenCalledWith(
          expect.stringContaining(applyPromptContains),
          expect.any(Object)
        );
        expect(result).toEqual(mockResult);
      });
    });

    if (fns.createFn) {
      describe('createFn', () => {
        it('creates reusable function from spec', async () => {
          llmMock.mockResolvedValue(mockResult);

          const fn = fns.createFn(mockSpec);
          expect(typeof fn).toBe('function');

          const r1 = await fn('item1');
          const r2 = await fn('item2');

          expect(r1).toEqual(mockResult);
          expect(r2).toEqual(mockResult);
          // specFn not called — spec was provided directly
          expect(llmMock).toHaveBeenCalledTimes(2);
        });

        it('exposes specification property', () => {
          const fn = fns.createFn(mockSpec);
          expect(fn.specification).toEqual(mockSpec);
        });
      });
    }
  });
}
