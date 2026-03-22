import { describe, expect, it } from 'vitest';

/**
 * Test a set of instruction builder functions (map, filter, reduce, find, group).
 *
 * Each builder must accept at least `{ specification }` and (except map) `{ processing }`.
 * The tests verify that each builder's output contains the spec and processing strings,
 * and the expected XML tags for that builder type.
 *
 * @param {Object} builders - Named builder functions
 * @param {Function} builders.mapInstructions
 * @param {Function} builders.filterInstructions
 * @param {Function} builders.reduceInstructions
 * @param {Function} builders.findInstructions
 * @param {Function} builders.groupInstructions
 * @param {Object} options
 * @param {string} options.specTag - XML tag that wraps the specification (e.g. 'score-specification', 'tag-specification')
 * @param {*} options.specification - Spec value to pass to builders
 * @param {Object} [options.extraArgs] - Additional args merged into every builder call (e.g. { vocabulary })
 * @param {Object} [options.xmlTags] - Override expected XML tags per builder type
 */
export function testInstructionBuilders(
  builders,
  { specTag, specification, extraArgs = {}, xmlTags = {} }
) {
  const tags = {
    filter: xmlTags.filter ?? 'filter-c', // 'filter-condition' or 'filter-criteria'
    reduce: xmlTags.reduce ?? 'reduce-operation',
    find: xmlTags.find ?? 'selection-criteria',
    group: xmlTags.group ?? 'grouping-strategy',
    ...xmlTags,
  };

  describe('instruction builders', () => {
    describe('mapInstructions', () => {
      it('contains specification tag', () => {
        const result = builders.mapInstructions({ specification, ...extraArgs });
        expect(result).toContain(specTag);
      });
    });

    describe('filterInstructions', () => {
      it('contains specification and processing', () => {
        const result = builders.filterInstructions({
          specification,
          processing: 'keep relevant items',
          ...extraArgs,
        });
        expect(result).toContain(specTag);
        expect(result).toContain(tags.filter);
        expect(result).toContain('keep relevant items');
      });
    });

    describe('reduceInstructions', () => {
      it('contains specification and processing', () => {
        const result = builders.reduceInstructions({
          specification,
          processing: 'aggregate all results',
          ...extraArgs,
        });
        expect(result).toContain(specTag);
        expect(result).toContain(tags.reduce);
        expect(result).toContain('aggregate all results');
      });
    });

    describe('findInstructions', () => {
      it('contains specification and processing', () => {
        const result = builders.findInstructions({
          specification,
          processing: 'best matching item',
          ...extraArgs,
        });
        expect(result).toContain(specTag);
        expect(result).toContain(tags.find);
        expect(result).toContain('best matching item');
      });
    });

    describe('groupInstructions', () => {
      it('contains specification and processing', () => {
        const result = builders.groupInstructions({
          specification,
          processing: 'cluster by similarity',
          ...extraArgs,
        });
        expect(result).toContain(specTag);
        expect(result).toContain(tags.group);
        expect(result).toContain('cluster by similarity');
      });
    });
  });
}
