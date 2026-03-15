import { describe, it, expect } from 'vitest';
import { extractSections, insertSections, _test } from './markers.js';

const { inspectPrompt, diffPrompts, listPlaceholders, fillPlaceholders } = _test;

describe('prompt-markers', () => {
  describe('extract', () => {
    it('should extract marked sections from a prompt', () => {
      const prompt = `<!-- marker:ctx-domain -->
Domain knowledge here
<!-- /marker:ctx-domain -->

Do the thing.

<!-- marker:nfr-privacy -->
Do not include PII.
<!-- /marker:nfr-privacy -->`;

      const { clean, sections } = extractSections(prompt);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toEqual({
        id: 'ctx-domain',
        content: 'Domain knowledge here',
      });
      expect(sections[1]).toEqual({
        id: 'nfr-privacy',
        content: 'Do not include PII.',
      });
      expect(clean).toBe('Do the thing.');
    });

    it('should return empty sections for prompts without markers', () => {
      const prompt = 'Just a plain prompt.';
      const { clean, sections } = extractSections(prompt);

      expect(sections).toHaveLength(0);
      expect(clean).toBe('Just a plain prompt.');
    });

    it('should handle multiline content in markers', () => {
      const prompt = `<!-- marker:align-examples -->
Input: headache
Output: cephalalgia

Input: bruise
Output: contusion
<!-- /marker:align-examples -->

Extract medical terms.`;

      const { clean, sections } = extractSections(prompt);

      expect(sections).toHaveLength(1);
      expect(sections[0].content).toContain('Input: headache');
      expect(sections[0].content).toContain('Input: bruise');
      expect(clean).toBe('Extract medical terms.');
    });

    it('should handle empty input', () => {
      const { clean, sections } = extractSections('');
      expect(sections).toHaveLength(0);
      expect(clean).toBe('');
    });
  });

  describe('insert', () => {
    it('should insert sections at correct positions', () => {
      const prompt = 'Extract entities from the text.';
      const sections = [
        { id: 'ctx-domain', placement: 'prepend', content: 'Domain: {domain_knowledge}' },
        { id: 'nfr-precision', placement: 'append', content: 'Requirement: prioritize accuracy.' },
      ];

      const result = insertSections(prompt, sections);

      expect(result).toContain('<!-- marker:ctx-domain -->');
      expect(result).toContain('<!-- /marker:ctx-domain -->');
      expect(result).toContain('<!-- marker:nfr-precision -->');
      expect(result).toContain('<!-- /marker:nfr-precision -->');

      const ctxPos = result.indexOf('marker:ctx-domain');
      const promptPos = result.indexOf('Extract entities');
      const nfrPos = result.indexOf('marker:nfr-precision');
      expect(ctxPos).toBeLessThan(promptPos);
      expect(promptPos).toBeLessThan(nfrPos);
    });

    it('should be idempotent — replacing existing markers on re-insert', () => {
      const promptWithMarkers = `<!-- marker:ctx-domain -->
Old domain info
<!-- /marker:ctx-domain -->

Extract entities from the text.`;

      const sections = [
        { id: 'ctx-domain', placement: 'prepend', content: 'Updated domain: {domain_knowledge}' },
      ];

      const result = insertSections(promptWithMarkers, sections);

      expect(result).not.toContain('Old domain info');
      expect(result).toContain('Updated domain: {domain_knowledge}');
      const markerCount = (result.match(/<!-- marker:ctx-domain -->/g) || []).length;
      expect(markerCount).toBe(1);
    });

    it('should preserve unmarked prompt content exactly', () => {
      const prompt = 'Line one.\n\nLine two.\n\nLine three.';
      const sections = [{ id: 'test-ext', placement: 'append', content: 'Appended.' }];

      const result = insertSections(prompt, sections);
      expect(result).toContain('Line one.\n\nLine two.\n\nLine three.');
    });

    it('should handle empty sections array', () => {
      const prompt = 'Just a prompt.';
      const result = insertSections(prompt, []);
      expect(result).toBe('Just a prompt.');
    });

    it('should handle multiple sections at same placement', () => {
      const prompt = 'Core task.';
      const sections = [
        { id: 'ctx-a', placement: 'prepend', content: 'Context A' },
        { id: 'ctx-b', placement: 'prepend', content: 'Context B' },
      ];

      const result = insertSections(prompt, sections);

      const aPos = result.indexOf('Context A');
      const bPos = result.indexOf('Context B');
      const corePos = result.indexOf('Core task.');
      expect(aPos).toBeLessThan(bPos);
      expect(bPos).toBeLessThan(corePos);
    });

    it('should round-trip through extract', () => {
      const original = 'Extract key findings from the report.';
      const sections = [
        { id: 'ctx-domain', placement: 'prepend', content: 'Domain: medical records' },
        {
          id: 'nfr-privacy',
          placement: 'append',
          content: 'Requirement: exclude all PII from output.',
        },
      ];

      const result = insertSections(original, sections);

      expect(result).toContain('Domain: medical records');
      expect(result).toContain('Extract key findings');
      expect(result).toContain('exclude all PII');

      const { clean, sections: extracted } = extractSections(result);
      expect(clean).toBe(original);
      expect(extracted).toHaveLength(2);
      expect(extracted.map((s) => s.id)).toEqual(['ctx-domain', 'nfr-privacy']);
    });
  });

  describe('_test.listPlaceholders', () => {
    it('should find unfilled placeholders', () => {
      const prompt = 'Use {domain_terms} and {examples} for extraction.';
      const placeholders = listPlaceholders(prompt);
      expect(placeholders).toEqual(['domain_terms', 'examples']);
    });

    it('should deduplicate repeated placeholder names', () => {
      const prompt = '{name} said hello to {name}.';
      const placeholders = listPlaceholders(prompt);
      expect(placeholders).toEqual(['name']);
    });

    it('should return empty for prompts without placeholders', () => {
      const placeholders = listPlaceholders('No placeholders here.');
      expect(placeholders).toEqual([]);
    });

    it('should find placeholders inside marker sections', () => {
      const prompt = `<!-- marker:ctx-domain -->
Domain: {domain_knowledge}
<!-- /marker:ctx-domain -->

Extract entities.`;

      const placeholders = listPlaceholders(prompt);
      expect(placeholders).toEqual(['domain_knowledge']);
    });
  });

  describe('_test.fillPlaceholders', () => {
    it('should replace placeholders with values', () => {
      const prompt = 'Terms: {domain_terms}\n\nExtract entities.';
      const filled = fillPlaceholders(prompt, { domain_terms: 'cephalalgia: headache' });
      expect(filled).toBe('Terms: cephalalgia: headache\n\nExtract entities.');
    });

    it('should leave unmatched placeholders intact', () => {
      const prompt = '{filled} and {unfilled}';
      const result = fillPlaceholders(prompt, { filled: 'yes' });
      expect(result).toBe('yes and {unfilled}');
    });

    it('should handle empty bindings', () => {
      const prompt = '{placeholder} stays.';
      const result = fillPlaceholders(prompt, {});
      expect(result).toBe('{placeholder} stays.');
    });

    it('should fill placeholders inside marker sections', () => {
      const prompt = `<!-- marker:ctx-domain -->
Domain: {domain_knowledge}
<!-- /marker:ctx-domain -->

Extract entities.`;

      const filled = fillPlaceholders(prompt, { domain_knowledge: 'medical records' });
      expect(filled).toContain('Domain: medical records');
      expect(filled).not.toContain('{domain_knowledge}');
    });

    it('should compose with insert — apply then fill', () => {
      const base = 'Extract entities.';
      const withMarkers = insertSections(base, [
        { id: 'ctx', placement: 'prepend', content: 'Context: {terms}' },
      ]);
      const filled = fillPlaceholders(withMarkers, { terms: 'fever = pyrexia' });

      expect(filled).toContain('Context: fever = pyrexia');
      expect(filled).toContain('Extract entities.');
      expect(filled).not.toContain('{terms}');
    });
  });

  describe('_test.inspectPrompt', () => {
    it('should return clean prompt, sections, and unfilled placeholders', () => {
      const prompt = `<!-- marker:ctx-domain -->
Domain: {domain_knowledge}
<!-- /marker:ctx-domain -->

Extract entities from {source}.

<!-- marker:nfr-privacy -->
Exclude PII.
<!-- /marker:nfr-privacy -->`;

      const result = inspectPrompt(prompt);

      expect(result.clean).toBe('Extract entities from {source}.');
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].id).toBe('ctx-domain');
      expect(result.sections[1].id).toBe('nfr-privacy');
      expect(result.placeholders).toEqual(['domain_knowledge', 'source']);
    });

    it('should return empty state for a plain prompt', () => {
      const result = inspectPrompt('Just a plain prompt.');
      expect(result.clean).toBe('Just a plain prompt.');
      expect(result.sections).toHaveLength(0);
      expect(result.placeholders).toEqual([]);
    });

    it('should show no placeholders when all are filled', () => {
      const prompt = `<!-- marker:ctx -->
Domain: medical records
<!-- /marker:ctx -->

Extract entities.`;

      const result = inspectPrompt(prompt);
      expect(result.placeholders).toEqual([]);
      expect(result.sections).toHaveLength(1);
    });
  });

  describe('_test.diffPrompts', () => {
    it('should detect added sections', () => {
      const before = 'Extract entities.';
      const after = insertSections(before, [
        { id: 'ctx-domain', placement: 'prepend', content: 'Domain: medical' },
      ]);

      const result = diffPrompts(before, after);

      expect(result.coreChanged).toBe(false);
      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe('ctx-domain');
      expect(result.removed).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
    });

    it('should detect removed sections', () => {
      const before = insertSections('Extract entities.', [
        { id: 'ctx-domain', placement: 'prepend', content: 'Domain: medical' },
      ]);
      const after = 'Extract entities.';

      const result = diffPrompts(before, after);

      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].id).toBe('ctx-domain');
      expect(result.added).toHaveLength(0);
    });

    it('should detect updated section content', () => {
      const base = 'Extract entities.';
      const before = insertSections(base, [
        { id: 'ctx', placement: 'prepend', content: 'Old context' },
      ]);
      const after = insertSections(base, [
        { id: 'ctx', placement: 'prepend', content: 'New context' },
      ]);

      const result = diffPrompts(before, after);

      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].id).toBe('ctx');
      expect(result.updated[0].content).toBe('New context');
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
    });

    it('should detect core prompt changes', () => {
      const result = diffPrompts('Extract entities.', 'Extract medical entities.');
      expect(result.coreChanged).toBe(true);
    });

    it('should report unchanged sections', () => {
      const base = 'Extract entities.';
      const sections = [{ id: 'ctx', placement: 'prepend', content: 'Context data' }];
      const before = insertSections(base, sections);
      const after = insertSections(base, [
        ...sections,
        { id: 'nfr', placement: 'append', content: 'No PII' },
      ]);

      const result = diffPrompts(before, after);

      expect(result.unchanged).toHaveLength(1);
      expect(result.unchanged[0].id).toBe('ctx');
      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe('nfr');
    });

    it('should return all-empty for identical prompts', () => {
      const prompt = insertSections('Task.', [{ id: 'a', placement: 'prepend', content: 'A' }]);

      const result = diffPrompts(prompt, prompt);

      expect(result.coreChanged).toBe(false);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.unchanged).toHaveLength(1);
    });
  });
});
