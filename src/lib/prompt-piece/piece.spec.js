import { describe, it, expect } from 'vitest';
import {
  createPiece,
  addInput,
  removeInput,
  render,
  matchSources,
  pendingInputs,
  isReady,
  ambiguousInputs,
  _test,
} from './piece.js';
import { extractSections } from './markers.js';

const { inspectPiece, diffPieces } = _test;

const input = (overrides = {}) => ({
  id: 'ctx-terms',
  label: 'Medical Terms',
  placement: 'prepend',
  tags: ['medical', 'glossary'],
  required: true,
  multi: false,
  ...overrides,
});

const source = (overrides = {}) => ({
  id: 'glossary-1',
  tags: ['medical', 'glossary'],
  content: 'cephalalgia: headache',
  ...overrides,
});

describe('prompt-piece', () => {
  describe('createPiece', () => {
    it('should create a piece with text and empty inputs', () => {
      const piece = createPiece('Extract entities from the text.');
      expect(piece.text).toBe('Extract entities from the text.');
      expect(piece.inputs).toEqual([]);
    });
  });

  describe('addInput', () => {
    it('should add an input to a piece', () => {
      const piece = addInput(createPiece('Task.'), input());
      expect(piece.inputs).toHaveLength(1);
      expect(piece.inputs[0].id).toBe('ctx-terms');
      expect(piece.inputs[0].tags).toEqual(['medical', 'glossary']);
    });

    it('should replace an input with the same id', () => {
      let piece = addInput(createPiece('Task.'), input());
      piece = addInput(piece, input({ label: 'Updated Label' }));
      expect(piece.inputs).toHaveLength(1);
      expect(piece.inputs[0].label).toBe('Updated Label');
    });

    it('should apply defaults for missing fields', () => {
      const piece = addInput(createPiece('Task.'), { id: 'minimal' });
      const i = piece.inputs[0];
      expect(i.label).toBe('minimal');
      expect(i.placement).toBe('prepend');
      expect(i.tags).toEqual([]);
      expect(i.required).toBe(false);
      expect(i.multi).toBe(false);
    });

    it('should not mutate the original piece', () => {
      const p1 = createPiece('Task.');
      const p2 = addInput(p1, input());
      expect(p1.inputs).toHaveLength(0);
      expect(p2.inputs).toHaveLength(1);
    });
  });

  describe('removeInput', () => {
    it('should remove an input by id', () => {
      let piece = addInput(createPiece('Task.'), input());
      piece = addInput(piece, input({ id: 'ctx-examples' }));
      piece = removeInput(piece, 'ctx-terms');
      expect(piece.inputs).toHaveLength(1);
      expect(piece.inputs[0].id).toBe('ctx-examples');
    });
  });

  describe('render', () => {
    it('should produce a prompt with content as marker sections', () => {
      const piece = addInput(createPiece('Extract entities.'), input());
      const prompt = render(piece, { 'ctx-terms': 'cephalalgia: headache' });

      expect(prompt).toContain('<!-- marker:ctx-terms -->');
      expect(prompt).toContain('cephalalgia: headache');
      expect(prompt).toContain('Extract entities.');
    });

    it('should respect placement order', () => {
      let piece = createPiece('Core task.');
      piece = addInput(piece, input({ id: 'pre', placement: 'prepend' }));
      piece = addInput(piece, input({ id: 'post', placement: 'append' }));

      const prompt = render(piece, { pre: 'Before', post: 'After' });
      const prePos = prompt.indexOf('Before');
      const corePos = prompt.indexOf('Core task');
      const postPos = prompt.indexOf('After');
      expect(prePos).toBeLessThan(corePos);
      expect(corePos).toBeLessThan(postPos);
    });

    it('should accept array content for multi-valued inputs', () => {
      const piece = addInput(createPiece('Task.'), input({ multi: true }));
      const prompt = render(piece, { 'ctx-terms': ['Term A', 'Term B'] });
      expect(prompt).toContain('Term A');
      expect(prompt).toContain('Term B');
    });

    it('should use placeholder when content is empty string', () => {
      const piece = addInput(createPiece('Task.'), input());
      const prompt = render(piece, { 'ctx-terms': '' });
      expect(prompt).toContain('{ctx-terms}');
    });

    it('should skip inputs not present in content', () => {
      let piece = createPiece('Task.');
      piece = addInput(piece, input({ id: 'mapped' }));
      piece = addInput(piece, input({ id: 'unmapped' }));

      const prompt = render(piece, { mapped: 'data' });
      expect(prompt).toContain('<!-- marker:mapped -->');
      expect(prompt).not.toContain('<!-- marker:unmapped -->');
    });

    it('should produce a prompt that round-trips through extractSections', () => {
      const piece = addInput(
        addInput(createPiece('Core.'), input({ id: 'pre', placement: 'prepend' })),
        input({ id: 'post', placement: 'append' })
      );
      const prompt = render(piece, { pre: 'Context A', post: 'Context B' });
      const { clean, sections } = extractSections(prompt);

      expect(clean).toBe('Core.');
      expect(sections).toHaveLength(2);
      expect(sections.map((s) => s.id)).toEqual(['pre', 'post']);
    });

    it('should return bare text when no content provided', () => {
      const piece = addInput(createPiece('Task.'), input());
      expect(render(piece)).toBe('Task.');
    });
  });

  describe('matchSources', () => {
    it('should resolve single-valued input when exactly one source qualifies', () => {
      const piece = addInput(createPiece('Task.'), input());
      const matches = matchSources(piece.inputs, [source()]);
      expect(matches['ctx-terms']).toHaveLength(1);
      expect(matches['ctx-terms'][0].sourceId).toBe('glossary-1');
      expect(matches['ctx-terms'][0].content).toBe('cephalalgia: headache');
    });

    it('should not resolve single-valued input when multiple sources qualify', () => {
      const piece = addInput(createPiece('Task.'), input());
      const matches = matchSources(piece.inputs, [
        source(),
        source({ id: 'glossary-2', content: 'edema: swelling' }),
      ]);
      expect(matches['ctx-terms']).toBeUndefined();
    });

    it('should resolve multi-valued input with all qualifying sources', () => {
      const piece = addInput(createPiece('Task.'), input({ multi: true }));
      const matches = matchSources(piece.inputs, [
        source(),
        source({ id: 'glossary-2', content: 'edema: swelling' }),
      ]);
      expect(matches['ctx-terms']).toHaveLength(2);
    });

    it('should skip pinned inputs', () => {
      const piece = addInput(createPiece('Task.'), input());
      const pinned = new Set(['ctx-terms']);
      const matches = matchSources(piece.inputs, [source()], pinned);
      expect(matches['ctx-terms']).toBeUndefined();
    });

    it('should skip inputs with no tags', () => {
      const piece = addInput(createPiece('Task.'), input({ tags: [] }));
      const matches = matchSources(piece.inputs, [source()]);
      expect(matches['ctx-terms']).toBeUndefined();
    });

    it('should require ALL tags to match (AND semantics)', () => {
      const piece = addInput(
        createPiece('Task.'),
        input({ tags: ['medical', 'glossary', 'rare'] })
      );
      const matches = matchSources(piece.inputs, [source()]);
      // source only has ['medical', 'glossary'], missing 'rare'
      expect(matches['ctx-terms']).toBeUndefined();
    });

    it('should not resolve when no sources qualify', () => {
      const piece = addInput(createPiece('Task.'), input());
      const matches = matchSources(piece.inputs, [source({ tags: ['unrelated'] })]);
      expect(matches['ctx-terms']).toBeUndefined();
    });

    it('should return empty object when no inputs match', () => {
      const piece = createPiece('Task.');
      const matches = matchSources(piece.inputs, [source()]);
      expect(matches).toEqual({});
    });
  });

  describe('pendingInputs / isReady', () => {
    it('should return required inputs without content', () => {
      const piece = addInput(
        addInput(createPiece('Task.'), input()),
        input({ id: 'ctx-examples', required: false })
      );
      expect(pendingInputs(piece)).toEqual(['ctx-terms']);
      expect(isReady(piece)).toBe(false);
    });

    it('should exclude inputs with provided content', () => {
      const piece = addInput(createPiece('Task.'), input());
      expect(pendingInputs(piece, { 'ctx-terms': 'data' })).toEqual([]);
      expect(isReady(piece, { 'ctx-terms': 'data' })).toBe(true);
    });

    it('should return empty when no required inputs exist', () => {
      const piece = addInput(createPiece('Task.'), input({ required: false }));
      expect(pendingInputs(piece)).toEqual([]);
      expect(isReady(piece)).toBe(true);
    });
  });

  describe('ambiguousInputs', () => {
    it('should report single-valued inputs with multiple qualifying sources', () => {
      const piece = addInput(createPiece('Task.'), input());
      const sources = [source(), source({ id: 'glossary-2' })];
      const ambiguous = ambiguousInputs(piece.inputs, sources);
      expect(ambiguous).toHaveLength(1);
      expect(ambiguous[0].inputId).toBe('ctx-terms');
      expect(ambiguous[0].candidates).toEqual(['glossary-1', 'glossary-2']);
    });

    it('should not report multi-valued inputs', () => {
      const piece = addInput(createPiece('Task.'), input({ multi: true }));
      expect(ambiguousInputs(piece.inputs, [source(), source({ id: 'g-2' })])).toEqual([]);
    });

    it('should not report pinned inputs', () => {
      const piece = addInput(createPiece('Task.'), input());
      const pinned = new Set(['ctx-terms']);
      expect(ambiguousInputs(piece.inputs, [source(), source({ id: 'g-2' })], pinned)).toEqual([]);
    });
  });

  describe('full workflow', () => {
    it('create piece → add inputs → match sources → render', () => {
      let piece = createPiece('Extract medical entities from the text.');
      piece = addInput(piece, input());
      piece = addInput(
        piece,
        input({
          id: 'ctx-examples',
          label: 'Examples',
          tags: ['medical', 'examples'],
          required: false,
          placement: 'append',
        })
      );

      expect(pendingInputs(piece)).toEqual(['ctx-terms']);
      expect(isReady(piece)).toBe(false);

      const sources = [
        source(),
        source({ id: 'examples-1', tags: ['medical', 'examples'], content: 'Example entities...' }),
      ];

      const matches = matchSources(piece.inputs, sources);
      expect(matches['ctx-terms'][0].content).toBe('cephalalgia: headache');
      expect(matches['ctx-examples'][0].content).toBe('Example entities...');

      // Convert matches to content map for rendering
      const content = Object.fromEntries(
        Object.entries(matches).map(([inputId, mappings]) => [
          inputId,
          mappings.map((m) => m.content).filter(Boolean),
        ])
      );

      expect(isReady(piece, content)).toBe(true);

      const prompt = render(piece, content);
      expect(prompt).toContain('cephalalgia: headache');
      expect(prompt).toContain('Example entities...');
      expect(prompt).toContain('Extract medical entities');
    });
  });

  describe('_test.inspectPiece', () => {
    it('should return piece summary', () => {
      let piece = createPiece('Task.');
      piece = addInput(piece, input());
      piece = addInput(piece, input({ id: 'ctx-examples', required: false, multi: true }));

      const info = inspectPiece(piece);

      expect(info.text).toBe('Task.');
      expect(info.inputCount).toBe(2);
      expect(info.inputIds).toEqual(['ctx-terms', 'ctx-examples']);
      expect(info.requiredInputs).toEqual(['ctx-terms']);
      expect(info.multiInputs).toEqual(['ctx-examples']);
    });
  });

  describe('_test.diffPieces', () => {
    it('should detect added and removed inputs', () => {
      const before = createPiece('Task.');
      const after = addInput(createPiece('Task.'), input());

      const diff = diffPieces(before, after);

      expect(diff.textChanged).toBe(false);
      expect(diff.inputsAdded).toHaveLength(1);
      expect(diff.inputsAdded[0].id).toBe('ctx-terms');
    });

    it('should detect text changes', () => {
      const diff = diffPieces(createPiece('Old.'), createPiece('New.'));
      expect(diff.textChanged).toBe(true);
    });

    it('should detect removed inputs', () => {
      const before = addInput(createPiece('Task.'), input());
      const after = createPiece('Task.');
      expect(diffPieces(before, after).inputsRemoved).toHaveLength(1);
    });
  });
});
