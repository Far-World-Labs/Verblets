import { describe, it, expect } from 'vitest';
import {
  createBundle,
  parseBundle,
  addExtensions,
  removeExtensions,
  bind,
  unbind,
  buildPrompt,
  inspectBundle,
  extensionStatus,
  pendingSlots,
  diffBundles,
  setDescription,
  withExtensions,
  withBindings,
  withDescription,
  withoutExtensions,
  withoutBindings,
} from './index.js';
import { extractSections, listSlots } from '../prompt-markers/index.js';

const ext = (overrides = {}) => ({
  id: 'ctx-terms',
  type: 'context',
  placement: 'prepend',
  preamble: 'Terminology:\n{{medical_terms}}',
  slot: 'medical_terms',
  need: 'A glossary of medical terms',
  effort: 'medium',
  rationale: 'Domain terms reduce ambiguity.',
  produces: 'Output uses correct medical terminology.',
  ...overrides,
});

describe('prompt-bundle', () => {
  describe('create', () => {
    it('should create a bundle with empty extensions and bindings', () => {
      const bundle = createBundle('Extract entities.');
      expect(bundle.base).toBe('Extract entities.');
      expect(bundle.extensions).toEqual([]);
      expect(bundle.bindings).toEqual({});
    });
  });

  describe('parseBundle', () => {
    it('should reconstruct a bundle from a built prompt string', () => {
      const original = addExtensions(createBundle('Extract entities.'), [
        ext({
          id: 'ctx-domain',
          placement: 'prepend',
          preamble: 'Domain: {{domain_knowledge}}',
          slot: 'domain_knowledge',
        }),
        ext({ id: 'nfr-privacy', placement: 'append', preamble: 'Exclude PII.' }),
      ]);

      const prompt = buildPrompt(original);
      const parsed = parseBundle(prompt);

      expect(parsed.base).toBe('Extract entities.');
      expect(parsed.extensions).toHaveLength(2);
      expect(parsed.extensions[0].id).toBe('ctx-domain');
      expect(parsed.extensions[0].placement).toBe('prepend');
      expect(parsed.extensions[0].preamble).toBe('Domain: {{domain_knowledge}}');
      expect(parsed.extensions[0].slot).toBe('domain_knowledge');
      expect(parsed.extensions[1].id).toBe('nfr-privacy');
      expect(parsed.extensions[1].placement).toBe('append');
    });

    it('should handle a plain prompt with no markers', () => {
      const parsed = parseBundle('Just a plain prompt.');

      expect(parsed.base).toBe('Just a plain prompt.');
      expect(parsed.extensions).toEqual([]);
      expect(parsed.bindings).toEqual({});
    });

    it('should detect slots in section content', () => {
      const prompt = buildPrompt(
        addExtensions(createBundle('Task.'), [
          ext({
            id: 'ctx-a',
            placement: 'prepend',
            preamble: 'Terms: {{medical_terms}}',
            slot: 'medical_terms',
          }),
        ])
      );

      const parsed = parseBundle(prompt);

      expect(parsed.extensions[0].slot).toBe('medical_terms');
    });

    it('should omit slot when section has no placeholders', () => {
      const prompt = buildPrompt(
        addExtensions(createBundle('Task.'), [
          ext({ id: 'nfr-a', placement: 'append', preamble: 'No placeholders here.' }),
        ])
      );

      const parsed = parseBundle(prompt);

      expect(parsed.extensions[0].slot).toBeUndefined();
    });

    it('should round-trip: buildPrompt(parseBundle(s)) preserves prompt content', () => {
      const original = buildPrompt(
        addExtensions(createBundle('Core task.'), [
          ext({ id: 'pre', placement: 'prepend', preamble: 'Before: {{a}}', slot: 'a' }),
          ext({ id: 'post', placement: 'append', preamble: 'After: {{b}}', slot: 'b' }),
        ])
      );

      const roundTripped = buildPrompt(parseBundle(original));

      expect(roundTripped).toBe(original);
    });
  });

  describe('extend', () => {
    it('should add extensions to a bundle', () => {
      const bundle = addExtensions(createBundle('Task.'), [ext(), ext({ id: 'nfr-pii' })]);
      expect(bundle.extensions).toHaveLength(2);
    });

    it('should merge by id — updating existing extensions', () => {
      const b1 = addExtensions(createBundle('Task.'), [ext()]);
      const b2 = addExtensions(b1, [ext({ preamble: 'Updated: {{medical_terms}}' })]);

      expect(b2.extensions).toHaveLength(1);
      expect(b2.extensions[0].preamble).toBe('Updated: {{medical_terms}}');
    });

    it('should not mutate the original bundle', () => {
      const b1 = createBundle('Task.');
      const b2 = addExtensions(b1, [ext()]);
      expect(b1.extensions).toHaveLength(0);
      expect(b2.extensions).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should remove extensions by id', () => {
      const bundle = addExtensions(createBundle('Task.'), [
        ext(),
        ext({ id: 'nfr-pii', slot: 'pii_rules' }),
      ]);
      const removeed = removeExtensions(bundle, ['ctx-terms']);

      expect(removeed.extensions).toHaveLength(1);
      expect(removeed.extensions[0].id).toBe('nfr-pii');
    });

    it('should clean up bindings for removed extensions', () => {
      const bundle = bind(addExtensions(createBundle('Task.'), [ext()]), {
        medical_terms: 'cephalalgia: headache',
      });

      const removeed = removeExtensions(bundle, ['ctx-terms']);
      expect(removeed.bindings).toEqual({});
    });

    it('should preserve bindings for retained extensions', () => {
      const bundle = bind(
        addExtensions(createBundle('Task.'), [
          ext(),
          ext({ id: 'nfr-pii', slot: 'pii_rules', preamble: 'Rules: {{pii_rules}}' }),
        ]),
        { medical_terms: 'data', pii_rules: 'no PII' }
      );

      const removeed = removeExtensions(bundle, ['ctx-terms']);
      expect(removeed.bindings).toEqual({ pii_rules: 'no PII' });
    });
  });

  describe('fill / clear', () => {
    it('should add bindings', () => {
      const bundle = bind(createBundle('Task.'), { terms: 'glossary data' });
      expect(bundle.bindings).toEqual({ terms: 'glossary data' });
    });

    it('should merge with existing bindings', () => {
      const b1 = bind(createBundle('Task.'), { a: '1' });
      const b2 = bind(b1, { b: '2' });
      expect(b2.bindings).toEqual({ a: '1', b: '2' });
    });

    it('should overwrite existing bindings', () => {
      const b1 = bind(createBundle('Task.'), { a: 'old' });
      const b2 = bind(b1, { a: 'new' });
      expect(b2.bindings).toEqual({ a: 'new' });
    });

    it('should remove bindings by slot name', () => {
      const bundle = bind(createBundle('Task.'), { a: '1', b: '2', c: '3' });
      const cleared = unbind(bundle, ['a', 'c']);
      expect(cleared.bindings).toEqual({ b: '2' });
    });
  });

  describe('describe', () => {
    it('should attach a description to the bundle', () => {
      const desc = {
        purpose: 'Extracts medical entities',
        inputs: 'Clinical notes',
        outputs: 'Entity list with types',
        qualities: ['domain-aware', 'PII-safe'],
        gaps: ['No confidence scores'],
      };

      const bundle = setDescription(createBundle('Task.'), desc);

      expect(bundle.description).toEqual(desc);
      expect(bundle.base).toBe('Task.');
    });

    it('should replace an existing description', () => {
      const b1 = setDescription(createBundle('Task.'), { purpose: 'old' });
      const b2 = setDescription(b1, { purpose: 'new' });

      expect(b2.description).toEqual({ purpose: 'new' });
    });

    it('should default to undefined on create', () => {
      expect(createBundle('Task.').description).toBeUndefined();
    });
  });

  describe('inspectBundle', () => {
    it('should summarize bundle state', () => {
      const bundle = bind(
        addExtensions(createBundle('Task.'), [
          ext(),
          ext({ id: 'nfr-pii', slot: 'pii_rules', preamble: '{{pii_rules}}' }),
        ]),
        { medical_terms: 'glossary' }
      );

      const result = inspectBundle(bundle);

      expect(result.base).toBe('Task.');
      expect(result.extensionCount).toBe(2);
      expect(result.pendingSlots).toEqual(['pii_rules']);
      expect(result.filledSlots).toEqual(['medical_terms']);
      expect(result.described).toBe(false);
    });

    it('should report described status', () => {
      const bundle = setDescription(createBundle('Task.'), { purpose: 'test' });
      const result = inspectBundle(bundle);

      expect(result.described).toBe(true);
    });

    it('should handle empty bundle', () => {
      const result = inspectBundle(createBundle('Task.'));

      expect(result.extensionCount).toBe(0);
      expect(result.pendingSlots).toEqual([]);
      expect(result.filledSlots).toEqual([]);
      expect(result.described).toBe(false);
    });
  });

  describe('build', () => {
    it('should produce a prompt with markers and filled slots', () => {
      const bundle = bind(addExtensions(createBundle('Extract entities.'), [ext()]), {
        medical_terms: 'cephalalgia: headache',
      });

      const prompt = buildPrompt(bundle);

      expect(prompt).toContain('<!-- marker:ctx-terms -->');
      expect(prompt).toContain('cephalalgia: headache');
      expect(prompt).toContain('Extract entities.');
      expect(prompt).not.toContain('{{medical_terms}}');
    });

    it('should leave unfilled slots as placeholders', () => {
      const bundle = addExtensions(createBundle('Extract entities.'), [ext()]);
      const prompt = buildPrompt(bundle);

      expect(prompt).toContain('{{medical_terms}}');
    });

    it('should respect placement order', () => {
      const bundle = addExtensions(createBundle('Core task.'), [
        ext({ id: 'pre', placement: 'prepend', preamble: 'Before: {{a}}', slot: 'a' }),
        ext({ id: 'post', placement: 'append', preamble: 'After: {{b}}', slot: 'b' }),
      ]);

      const prompt = buildPrompt(bundle);
      const prePos = prompt.indexOf('Before');
      const corePos = prompt.indexOf('Core task');
      const postPos = prompt.indexOf('After');
      expect(prePos).toBeLessThan(corePos);
      expect(corePos).toBeLessThan(postPos);
    });

    it('should produce a prompt that round-trips through extract', () => {
      const bundle = addExtensions(createBundle('Task.'), [
        ext({ id: 'a', placement: 'prepend', preamble: 'Context A' }),
        ext({ id: 'b', placement: 'append', preamble: 'Context B' }),
      ]);

      const prompt = buildPrompt(bundle);
      const { clean, sections } = extractSections(prompt);

      expect(clean).toBe('Task.');
      expect(sections).toHaveLength(2);
      expect(sections.map((s) => s.id)).toEqual(['a', 'b']);
    });

    it('should be idempotent', () => {
      const bundle = bind(addExtensions(createBundle('Task.'), [ext()]), { medical_terms: 'data' });

      expect(buildPrompt(bundle)).toBe(buildPrompt(bundle));
    });
  });

  describe('status', () => {
    it('should mark extensions with bindings as filled', () => {
      const bundle = bind(addExtensions(createBundle('Task.'), [ext()]), {
        medical_terms: 'glossary',
      });

      const result = extensionStatus(bundle);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('filled');
      expect(result[0].id).toBe('ctx-terms');
    });

    it('should mark extensions without bindings as unfilled', () => {
      const bundle = addExtensions(createBundle('Task.'), [ext()]);

      const result = extensionStatus(bundle);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('unfilled');
    });

    it('should handle mixed states', () => {
      const bundle = bind(
        addExtensions(createBundle('Task.'), [
          ext(),
          ext({ id: 'nfr-pii', slot: 'pii_rules', preamble: 'Rules: {{pii_rules}}' }),
        ]),
        { medical_terms: 'glossary' }
      );

      const result = extensionStatus(bundle);
      expect(result[0].status).toBe('filled');
      expect(result[1].status).toBe('unfilled');
    });

    it('should preserve full extension metadata', () => {
      const bundle = addExtensions(createBundle('Task.'), [ext()]);
      const result = extensionStatus(bundle);

      expect(result[0].need).toBe('A glossary of medical terms');
      expect(result[0].produces).toBe('Output uses correct medical terminology.');
      expect(result[0].effort).toBe('medium');
    });

    it('should mark slotless extensions as filled', () => {
      const bundle = addExtensions(createBundle('Task.'), [
        ext({ id: 'nfr-info', slot: undefined, preamble: 'Pure informational text.' }),
      ]);

      const result = extensionStatus(bundle);
      expect(result[0].status).toBe('filled');
    });
  });

  describe('pending', () => {
    it('should return slot names that need data', () => {
      const bundle = addExtensions(createBundle('Task.'), [
        ext(),
        ext({ id: 'nfr-pii', slot: 'pii_rules', preamble: 'Rules: {{pii_rules}}' }),
      ]);

      expect(pendingSlots(bundle)).toEqual(['medical_terms', 'pii_rules']);
    });

    it('should exclude filled slots', () => {
      const bundle = bind(
        addExtensions(createBundle('Task.'), [
          ext(),
          ext({ id: 'nfr-pii', slot: 'pii_rules', preamble: 'Rules: {{pii_rules}}' }),
        ]),
        { medical_terms: 'glossary' }
      );

      expect(pendingSlots(bundle)).toEqual(['pii_rules']);
    });

    it('should return empty when all slots are filled', () => {
      const bundle = bind(addExtensions(createBundle('Task.'), [ext()]), {
        medical_terms: 'glossary',
      });

      expect(pendingSlots(bundle)).toEqual([]);
    });

    it('should exclude extensions without a slot field', () => {
      const bundle = addExtensions(createBundle('Task.'), [
        ext(),
        ext({ id: 'nfr-info', slot: undefined, preamble: 'Pure informational text.' }),
      ]);

      expect(pendingSlots(bundle)).toEqual(['medical_terms']);
    });
  });

  describe('diff', () => {
    it('should detect base prompt changes', () => {
      const before = createBundle('Old task.');
      const after = createBundle('New task.');

      const result = diffBundles(before, after);
      expect(result.baseChanged).toBe(true);
    });

    it('should detect added and removed extensions', () => {
      const a = ext({ id: 'a', slot: 'sa' });
      const b = ext({ id: 'b', slot: 'sb' });
      const c = ext({ id: 'c', slot: 'sc' });

      const before = addExtensions(createBundle('Task.'), [a, b]);
      const after = addExtensions(createBundle('Task.'), [b, c]);

      const result = diffBundles(before, after);

      expect(result.extensionsAdded).toHaveLength(1);
      expect(result.extensionsAdded[0].id).toBe('c');
      expect(result.extensionsRemoved).toHaveLength(1);
      expect(result.extensionsRemoved[0].id).toBe('a');
    });

    it('should detect binding changes', () => {
      const base = addExtensions(createBundle('Task.'), [
        ext(),
        ext({ id: 'nfr', slot: 'rules', preamble: '{{rules}}' }),
        ext({ id: 'ctx', slot: 'ctx_data', preamble: '{{ctx_data}}' }),
      ]);

      const before = bind(base, { medical_terms: 'old', rules: 'strict' });
      const after = bind(base, { medical_terms: 'new', ctx_data: 'fresh' });

      const result = diffBundles(before, after);

      expect(result.bindingsChanged).toEqual(['medical_terms']);
      expect(result.bindingsAdded).toEqual(['ctx_data']);
      expect(result.bindingsRemoved).toEqual(['rules']);
    });

    it('should report no changes for identical bundles', () => {
      const bundle = bind(addExtensions(createBundle('Task.'), [ext()]), { medical_terms: 'data' });

      const result = diffBundles(bundle, bundle);

      expect(result.baseChanged).toBe(false);
      expect(result.extensionsAdded).toHaveLength(0);
      expect(result.extensionsRemoved).toHaveLength(0);
      expect(result.bindingsAdded).toHaveLength(0);
      expect(result.bindingsRemoved).toHaveLength(0);
      expect(result.bindingsChanged).toHaveLength(0);
    });
  });

  describe('curried pipe helpers', () => {
    it('withExtensions should return a function that adds extensions', () => {
      const addTerms = withExtensions([ext()]);
      const bundle = addTerms(createBundle('Task.'));

      expect(bundle.extensions).toHaveLength(1);
      expect(bundle.extensions[0].id).toBe('ctx-terms');
    });

    it('withBindings should return a function that adds bindings', () => {
      const addTermData = withBindings({ medical_terms: 'glossary' });
      const bundle = addTermData(createBundle('Task.'));

      expect(bundle.bindings).toEqual({ medical_terms: 'glossary' });
    });

    it('withDescription should return a function that sets description', () => {
      const describe = withDescription({ purpose: 'entity extraction' });
      const bundle = describe(createBundle('Task.'));

      expect(bundle.description).toEqual({ purpose: 'entity extraction' });
    });

    it('withoutExtensions should return a function that removes by id', () => {
      const removeTerms = withoutExtensions(['ctx-terms']);
      const bundle = removeTerms(addExtensions(createBundle('Task.'), [ext()]));

      expect(bundle.extensions).toHaveLength(0);
    });

    it('withoutBindings should return a function that removes bindings', () => {
      const clearTerms = withoutBindings(['medical_terms']);
      const bundle = clearTerms(
        bind(createBundle('Task.'), { medical_terms: 'data', other: 'kept' })
      );

      expect(bundle.bindings).toEqual({ other: 'kept' });
    });

    it('should compose naturally in sequence', () => {
      const bundle = [
        withExtensions([ext()]),
        withBindings({ medical_terms: 'glossary' }),
        withDescription({ purpose: 'extraction' }),
      ].reduce((b, fn) => fn(b), createBundle('Task.'));

      expect(bundle.extensions).toHaveLength(1);
      expect(bundle.bindings).toEqual({ medical_terms: 'glossary' });
      expect(bundle.description).toEqual({ purpose: 'extraction' });
      expect(bundle.base).toBe('Task.');
    });
  });

  describe('full workflow', () => {
    it('create → extend → fill → build → verify', () => {
      const b1 = createBundle('Extract medical entities from the text.');

      const suggestions = [
        ext(),
        ext({
          id: 'nfr-privacy',
          type: 'nfr',
          placement: 'append',
          preamble: 'Privacy rules:\n{{pii_rules}}',
          slot: 'pii_rules',
          need: 'PII handling rules',
          produces: 'Output excludes personally identifiable information.',
        }),
      ];

      const b2 = addExtensions(b1, suggestions);
      expect(pendingSlots(b2)).toEqual(['medical_terms', 'pii_rules']);

      const b3 = bind(b2, { medical_terms: 'cephalalgia: headache\nedema: swelling' });
      expect(pendingSlots(b3)).toEqual(['pii_rules']);

      const statuses = extensionStatus(b3);
      expect(statuses.find((s) => s.id === 'ctx-terms').status).toBe('filled');
      expect(statuses.find((s) => s.id === 'nfr-privacy').status).toBe('unfilled');

      const b4 = bind(b3, { pii_rules: 'Remove all patient names and dates.' });
      expect(pendingSlots(b4)).toEqual([]);

      const prompt = buildPrompt(b4);
      expect(prompt).toContain('cephalalgia: headache');
      expect(prompt).toContain('Remove all patient names');
      expect(prompt).toContain('Extract medical entities');
      expect(listSlots(prompt)).toEqual([]);

      const changes = diffBundles(b1, b4);
      expect(changes.extensionsAdded).toHaveLength(2);
      expect(changes.bindingsAdded).toEqual(['medical_terms', 'pii_rules']);
    });
  });
});
