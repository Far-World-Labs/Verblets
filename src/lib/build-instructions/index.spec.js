import { describe, it, expect } from 'vitest';
import buildInstructions from './index.js';

const DEFAULTS = {
  map: 'Default map text.',
  filter: 'Default filter text.',
  find: 'Default find text.',
  group: 'Default group text.',
};

const STEPS = {
  reduce: 'Reduce step description.',
  filter: 'Filter step description.',
  find: 'Find step description.',
  group: 'Group step description.',
};

const mockSpec = { threshold: 0.5, categories: ['pii-name'] };

describe('buildInstructions', () => {
  describe('minimal config (old-chain pattern: no specIntro, no suffix)', () => {
    const {
      mapInstructions,
      filterInstructions,
      reduceInstructions,
      findInstructions,
      groupInstructions,
    } = buildInstructions({
      specTag: 'scale-specification',
      defaults: DEFAULTS,
      steps: STEPS,
      mapApplyLine: 'Apply this scale to each item:',
    });

    it('mapInstructions with processing includes apply line and spec XML', () => {
      const result = mapInstructions({ specification: mockSpec, processing: 'Transform values' });
      expect(result).toContain('<processing-instructions>');
      expect(result).toContain('Transform values');
      expect(result).toContain('Apply this scale to each item:');
      expect(result).toContain('<scale-specification>');
    });

    it('mapInstructions without processing uses default', () => {
      const result = mapInstructions({ specification: mockSpec });
      expect(result).toContain('Default map text.');
      expect(result).toContain('<scale-specification>');
      expect(result).not.toContain('<processing-instructions>');
      expect(result).not.toContain('Apply this scale');
    });

    it('filterInstructions with processing includes filter-criteria tag and steps', () => {
      const result = filterInstructions({
        specification: mockSpec,
        processing: 'Keep high values',
      });
      expect(result).toContain('<filter-criteria>');
      expect(result).toContain('Keep high values');
      expect(result).toContain('Filter step description.');
      expect(result).toContain('<scale-specification>');
    });

    it('filterInstructions without processing uses default', () => {
      const result = filterInstructions({ specification: mockSpec });
      expect(result).toContain('Default filter text.');
      expect(result).toContain('<scale-specification>');
      expect(result).not.toContain('<filter-criteria>');
    });

    it('reduceInstructions always wraps processing in reduce-operation tag', () => {
      const result = reduceInstructions({ specification: mockSpec, processing: 'Sum all values' });
      expect(result).toContain('<reduce-operation>');
      expect(result).toContain('Sum all values');
      expect(result).toContain('Reduce step description.');
      expect(result).toContain('<scale-specification>');
    });

    it('findInstructions with processing includes selection-criteria tag and steps', () => {
      const result = findInstructions({ specification: mockSpec, processing: 'Find maximum' });
      expect(result).toContain('<selection-criteria>');
      expect(result).toContain('Find maximum');
      expect(result).toContain('Find step description.');
      expect(result).toContain('<scale-specification>');
    });

    it('findInstructions without processing uses default', () => {
      const result = findInstructions({ specification: mockSpec });
      expect(result).toContain('Default find text.');
      expect(result).toContain('<scale-specification>');
    });

    it('groupInstructions with processing includes grouping-strategy tag and steps', () => {
      const result = groupInstructions({ specification: mockSpec, processing: 'Group by range' });
      expect(result).toContain('<grouping-strategy>');
      expect(result).toContain('Group by range');
      expect(result).toContain('Group step description.');
      expect(result).toContain('<scale-specification>');
    });

    it('groupInstructions without processing uses default', () => {
      const result = groupInstructions({ specification: mockSpec });
      expect(result).toContain('Default group text.');
      expect(result).toContain('<scale-specification>');
    });
  });

  describe('full config (new-chain pattern: specIntro + suffix)', () => {
    const {
      mapInstructions,
      filterInstructions,
      reduceInstructions,
      findInstructions,
      groupInstructions,
    } = buildInstructions({
      specTag: 'guard-specification',
      defaults: DEFAULTS,
      steps: STEPS,
      mapApplyLine: 'Apply this guard to each item:',
      mapSuffix: {
        processing: 'Return the protected text with metadata.',
        default: 'Return the protected text.',
      },
      specIntro: {
        filter: 'For items that pass, apply this guard:',
        reduce: 'Apply this guard to the result:',
        find: 'Apply this guard to the selected item:',
        group: 'Apply this guard within each group:',
      },
    });

    it('mapInstructions with processing includes apply line, spec, and suffix', () => {
      const result = mapInstructions({ specification: mockSpec, processing: 'Guard each record' });
      expect(result).toContain('<processing-instructions>');
      expect(result).toContain('Apply this guard to each item:');
      expect(result).toContain('<guard-specification>');
      expect(result).toContain('Return the protected text with metadata.');
    });

    it('mapInstructions without processing uses default and default suffix', () => {
      const result = mapInstructions({ specification: mockSpec });
      expect(result).toContain('Default map text.');
      expect(result).toContain('<guard-specification>');
      expect(result).toContain('Return the protected text.');
      expect(result).not.toContain('Return the protected text with metadata.');
    });

    it('filterInstructions includes specIntro before spec XML in both branches', () => {
      const withProc = filterInstructions({
        specification: mockSpec,
        processing: 'Keep sensitive',
      });
      expect(withProc).toContain('Filter step description.');
      expect(withProc).toContain('For items that pass, apply this guard:');
      expect(withProc).toContain('<guard-specification>');

      const withDefault = filterInstructions({ specification: mockSpec });
      expect(withDefault).toContain('Default filter text.');
      expect(withDefault).toContain('For items that pass, apply this guard:');
      expect(withDefault).toContain('<guard-specification>');
    });

    it('reduceInstructions includes specIntro before spec XML', () => {
      const result = reduceInstructions({ specification: mockSpec, processing: 'Combine records' });
      expect(result).toContain('Apply this guard to the result:');
      expect(result).toContain('<guard-specification>');
    });

    it('findInstructions includes specIntro before spec XML in both branches', () => {
      const withProc = findInstructions({
        specification: mockSpec,
        processing: 'Find most sensitive',
      });
      expect(withProc).toContain('Apply this guard to the selected item:');

      const withDefault = findInstructions({ specification: mockSpec });
      expect(withDefault).toContain('Apply this guard to the selected item:');
    });

    it('groupInstructions includes specIntro before spec XML in both branches', () => {
      const withProc = groupInstructions({
        specification: mockSpec,
        processing: 'Group by severity',
      });
      expect(withProc).toContain('Apply this guard within each group:');

      const withDefault = groupInstructions({ specification: mockSpec });
      expect(withDefault).toContain('Apply this guard within each group:');
    });
  });

  describe('reduceDefault fallback', () => {
    const { reduceInstructions } = buildInstructions({
      specTag: 'entity-specification',
      defaults: DEFAULTS,
      steps: STEPS,
      reduceDefault: 'Build comprehensive entity list from all chunks',
    });

    it('uses reduceDefault when no processing provided', () => {
      const result = reduceInstructions({ specification: mockSpec });
      expect(result).toContain('Build comprehensive entity list from all chunks');
      expect(result).toContain('<entity-specification>');
    });

    it('uses provided processing over reduceDefault', () => {
      const result = reduceInstructions({ specification: mockSpec, processing: 'Custom reduce' });
      expect(result).toContain('Custom reduce');
      expect(result).not.toContain('Build comprehensive entity list');
    });
  });

  describe('structural correctness', () => {
    const { mapInstructions, filterInstructions } = buildInstructions({
      specTag: 'test-specification',
      defaults: DEFAULTS,
      steps: STEPS,
    });

    it('spec XML tag wraps the specification object', () => {
      const result = mapInstructions({ specification: { key: 'value' } });
      expect(result).toContain('<test-specification>');
      expect(result).toContain('"key"');
      expect(result).toContain('"value"');
      expect(result).toContain('</test-specification>');
    });

    it('filter without specIntro has blank-line separation between default and spec', () => {
      const result = filterInstructions({ specification: mockSpec });
      // Default text followed by blank line followed by spec
      expect(result).toMatch(/Default filter text\.\n\n<test-specification>/);
    });
  });
});
