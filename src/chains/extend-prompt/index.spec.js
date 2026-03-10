import { describe, it, expect, vi, beforeEach } from 'vitest';
import extendPrompt, {
  applyExtensions,
  resolveExtensions,
  shapePrompt,
  describePrompt,
  extendBundle,
  shapeBundle,
  describeBundle,
} from './index.js';
import llm from '../../lib/llm/index.js';
import { extractSections, fillSlots } from '../../lib/prompt-markers/index.js';
import * as promptBundle from '../../lib/prompt-bundle/index.js';
import pipe from '../../lib/pipe/index.js';

vi.mock('../../lib/llm/index.js');

const mockExtension = (overrides = {}) => ({
  id: 'ctx-medical-terms',
  type: 'context',
  placement: 'prepend',
  preamble:
    'The following medical terminology should inform your extraction:\n<reference name="medical-terms">\n{{medical_terms}}\n</reference>',
  slot: 'medical_terms',
  need: 'A glossary of medical terms relevant to the input domain',
  effort: 'medium',
  rationale:
    'Domain terminology is the highest-impact improvement because the prompt currently has no domain context. Medical text has synonyms and abbreviations that confuse general-purpose extraction. A 20-term glossary would cover most cases and is easy to maintain.',
  produces:
    'Output will use correct medical terminology and recognize domain-specific abbreviations, reducing misclassification of synonymous terms.',
  ...overrides,
});

describe('extendPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LLM call structure', () => {
    it('should call LLM with prompt analysis request and return extensions', async () => {
      const extensions = [
        mockExtension(),
        mockExtension({
          id: 'align-examples',
          type: 'alignment',
          slot: 'examples',
          preamble: 'Examples of expected output:\n{{examples}}',
          need: 'Input/output pairs showing expected entity extraction',
          rationale: 'Few-shot examples calibrate the extraction format and coverage',
        }),
      ];

      vi.mocked(llm).mockResolvedValueOnce(extensions);

      const result = await extendPrompt('Extract named entities from the text.', {
        suggestions: ['add medical context'],
      });

      expect(result).toEqual(extensions);

      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('<prompt>'),
        expect.objectContaining({
          modelOptions: expect.objectContaining({
            systemPrompt: expect.stringContaining('prompt engineering advisor'),
            response_format: expect.objectContaining({
              type: 'json_schema',
            }),
          }),
        })
      );

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('Extract named entities');
      expect(callPrompt).toContain('<suggestions>');
      expect(callPrompt).toContain('add medical context');
    });

    it('should work with no suggestions', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      const result = await extendPrompt('Simple prompt.');

      expect(result).toEqual([]);
      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).not.toContain('<suggestions>');
    });
  });

  describe('suggestions forwarding', () => {
    it('should accept a string suggestion', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await extendPrompt('Test.', { suggestions: 'add context' });

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('<suggestions>');
      expect(callPrompt).toContain('add context');
    });

    it('should accept an array of suggestions', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await extendPrompt('Test.', { suggestions: ['add context', 'improve safety'] });

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('add context');
      expect(callPrompt).toContain('improve safety');
    });
  });

  describe('existing extension detection', () => {
    it('should pass existing markers to LLM for idempotent merge', async () => {
      vi.mocked(llm).mockResolvedValueOnce([
        mockExtension({ id: 'ctx-domain', preamble: 'Updated: {{domain}}' }),
      ]);

      const promptWithMarkers = `<!-- marker:ctx-domain -->
Old domain info
<!-- /marker:ctx-domain -->

Do the thing.`;

      await extendPrompt(promptWithMarkers);

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('<existing-extensions>');
      expect(callPrompt).toContain('ctx-domain');
    });
  });

  describe('config passthrough', () => {
    it('should forward llm config options', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await extendPrompt('Test prompt.', { llm: 'fastGood', temperature: 0.5 });

      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          llm: 'fastGood',
          temperature: 0.5,
        })
      );
    });

    it('should include maxExtensions cap in system prompt and user prompt', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await extendPrompt('Test.', { maxExtensions: 3 });

      const callOptions = llm.mock.calls[0][1];
      expect(callOptions.modelOptions.systemPrompt).toContain('at most 3');

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('at most 3');
    });

    it('should default maxExtensions to 5', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await extendPrompt('Test.');

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('at most 5');
    });

    it('should emit progress events during extension generation', async () => {
      vi.mocked(llm).mockResolvedValueOnce([mockExtension()]);

      const onProgress = vi.fn();
      await extendPrompt('Test.', { onProgress });

      const events = onProgress.mock.calls.map((c) => c[0]);
      const stepEvent = events.find((e) => e.event === 'step' && e.stepName === 'analyzing');
      expect(stepEvent).toBeDefined();
      expect(stepEvent.step).toBe('extend-prompt');
      expect(stepEvent.chainStartTime).toBeInstanceOf(Date);

      const completeEvent = events.find(
        (e) =>
          e.event === 'complete' && e.step === 'extend-prompt' && e.extensionCount !== undefined
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.extensionCount).toBe(1);
      expect(completeEvent.extensionIds).toEqual(['ctx-medical-terms']);
    });

    it('should instruct LLM to describe downstream produces', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await extendPrompt('Test.');

      const callOptions = llm.mock.calls[0][1];
      expect(callOptions.modelOptions.systemPrompt).toContain('produces');
      expect(callOptions.modelOptions.systemPrompt).toContain('downstream');
    });
  });

  describe('applyExtensions round-trip', () => {
    it('should produce a prompt that round-trips through extract', async () => {
      const extensions = [
        mockExtension({
          id: 'ctx-domain',
          placement: 'prepend',
          preamble: 'Domain: medical records',
        }),
        mockExtension({
          id: 'nfr-privacy',
          type: 'nfr',
          placement: 'append',
          preamble: 'Requirement: exclude all PII from output.',
        }),
      ];

      vi.mocked(llm).mockResolvedValueOnce(extensions);

      const original = 'Extract key findings from the report.';
      const suggested = await extendPrompt(original);
      const shaped = applyExtensions(original, suggested);

      expect(shaped).toContain('Domain: medical records');
      expect(shaped).toContain('Extract key findings');
      expect(shaped).toContain('exclude all PII');

      const { clean, sections } = extractSections(shaped);
      expect(clean).toBe(original);
      expect(sections).toHaveLength(2);
      expect(sections.map((s) => s.id)).toEqual(['ctx-domain', 'nfr-privacy']);
    });

    it('should be idempotent when re-applying extensions', () => {
      const original = 'Do the thing.';
      const extensions = [
        mockExtension({ id: 'ctx-a', placement: 'prepend', preamble: 'Context A' }),
      ];

      const first = applyExtensions(original, extensions);
      const second = applyExtensions(first, extensions);

      expect(first).toBe(second);
    });
  });

  describe('resolveExtensions', () => {
    it('should mark applied extensions with filled slots as filled', () => {
      const ext = mockExtension({
        id: 'ctx-domain',
        slot: 'domain_terms',
        preamble: 'Terms: {{domain_terms}}',
      });
      const prompt = applyExtensions('Task.', [ext]);
      const filled = fillSlots(prompt, { domain_terms: 'cephalalgia: headache' });

      const resolved = resolveExtensions(filled, [ext]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].status).toBe('filled');
      expect(resolved[0].id).toBe('ctx-domain');
    });

    it('should mark applied extensions with unfilled slots as unfilled', () => {
      const ext = mockExtension({
        id: 'ctx-domain',
        slot: 'domain_terms',
        preamble: 'Terms: {{domain_terms}}',
      });
      const prompt = applyExtensions('Task.', [ext]);

      const resolved = resolveExtensions(prompt, [ext]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].status).toBe('unfilled');
    });

    it('should mark unapplied extensions as pending', () => {
      const ext = mockExtension({ id: 'ctx-domain' });

      const resolved = resolveExtensions('Task.', [ext]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].status).toBe('pending');
    });

    it('should handle mixed states across multiple extensions', () => {
      const applied = mockExtension({
        id: 'ctx-filled',
        slot: 'terms',
        preamble: 'Terms: {{terms}}',
      });
      const unfilled = mockExtension({
        id: 'ctx-empty',
        slot: 'examples',
        preamble: 'Examples: {{examples}}',
      });
      const pending = mockExtension({ id: 'ctx-pending' });

      const prompt = applyExtensions('Task.', [applied, unfilled]);
      const filled = fillSlots(prompt, { terms: 'data' });

      const resolved = resolveExtensions(filled, [applied, unfilled, pending]);

      expect(resolved[0].status).toBe('filled');
      expect(resolved[1].status).toBe('unfilled');
      expect(resolved[2].status).toBe('pending');
    });
  });

  describe('describePrompt', () => {
    it('should call LLM and return prompt description', async () => {
      const mockDescription = {
        purpose: 'Extracts named entities from medical text',
        inputs: 'Clinical notes or medical reports as text',
        outputs: 'A list of named entities with types and positions',
        qualities: ['domain-aware', 'PII-safe'],
        gaps: ['No output format specified', 'No error handling for non-medical input'],
      };

      vi.mocked(llm).mockResolvedValueOnce(mockDescription);

      const result = await describePrompt('Extract entities from medical text.');

      expect(result).toEqual(mockDescription);
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('<prompt>'),
        expect.objectContaining({
          modelOptions: expect.objectContaining({
            systemPrompt: expect.stringContaining('I/O contract'),
            response_format: expect.objectContaining({
              type: 'json_schema',
            }),
          }),
        })
      );
    });

    it('should forward llm config options', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: '',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      await describePrompt('Test.', { llm: 'fastGood', temperature: 0.3 });

      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          llm: 'fastGood',
          temperature: 0.3,
        })
      );
    });

    it('should include marker-aware instructions in system prompt', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: '',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      await describePrompt('Test.');

      const callOptions = llm.mock.calls[0][1];
      expect(callOptions.modelOptions.systemPrompt).toContain('marker');
      expect(callOptions.modelOptions.systemPrompt).toContain('slot_name');
    });

    it('should emit progress events during description', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: 'Test',
        inputs: 'text',
        outputs: 'result',
        qualities: ['accurate'],
        gaps: ['no format spec', 'no examples'],
      });

      const onProgress = vi.fn();
      await describePrompt('Test.', { onProgress });

      const events = onProgress.mock.calls.map((c) => c[0]);

      const stepEvent = events.find((e) => e.event === 'step' && e.step === 'describe-prompt');
      expect(stepEvent).toBeDefined();
      expect(stepEvent.stepName).toBe('analyzing');

      const describeComplete = events.find(
        (e) => e.event === 'complete' && e.step === 'describe-prompt' && e.gapCount !== undefined
      );
      expect(describeComplete).toBeDefined();
      expect(describeComplete.gapCount).toBe(2);
      expect(describeComplete.qualityCount).toBe(1);
    });
  });

  describe('shapePrompt', () => {
    it('should extend and apply in one call, returning shaped prompt + extensions', async () => {
      const extensions = [
        mockExtension({
          id: 'ctx-domain',
          placement: 'prepend',
          preamble: 'Domain: {{domain_terms}}',
        }),
        mockExtension({
          id: 'nfr-privacy',
          type: 'nfr',
          placement: 'append',
          preamble: 'Requirement: exclude PII. {{pii_rules}}',
          slot: 'pii_rules',
        }),
      ];

      vi.mocked(llm).mockResolvedValueOnce(extensions);

      const original = 'Extract key findings from the report.';
      const result = await shapePrompt(original);

      // Returns shaped prompt string with markers applied
      expect(result.prompt).toContain('Domain: {{domain_terms}}');
      expect(result.prompt).toContain('Extract key findings');
      expect(result.prompt).toContain('exclude PII');
      expect(result.prompt).toContain('<!-- marker:ctx-domain -->');

      // Returns the extensions for introspection and reuse
      expect(result.extensions).toEqual(extensions);

      // Extensions can be reapplied to another prompt via applyExtensions
      const reshaped = applyExtensions('Extract key findings from the report.', result.extensions);
      expect(reshaped).toBe(result.prompt);
    });

    it('should forward config to extendPrompt', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await shapePrompt('Test.', { suggestions: 'add safety', llm: 'fastGood' });

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('<suggestions>');
      expect(callPrompt).toContain('add safety');
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ llm: 'fastGood' })
      );
    });

    it('should return empty extensions when LLM suggests none', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      const result = await shapePrompt('Already perfect prompt.');

      expect(result.prompt).toBe('Already perfect prompt.');
      expect(result.extensions).toEqual([]);
    });

    it('should emit extending, applying, and complete progress events', async () => {
      vi.mocked(llm).mockResolvedValueOnce([mockExtension()]);

      const onProgress = vi.fn();
      await shapePrompt('Test.', { onProgress });

      const events = onProgress.mock.calls.map((c) => c[0]);
      const shapeEvents = events.filter((e) => e.step === 'shape-prompt');

      const extending = shapeEvents.find((e) => e.stepName === 'extending');
      expect(extending).toBeDefined();
      expect(extending.chainStartTime).toBeInstanceOf(Date);

      const applying = shapeEvents.find((e) => e.stepName === 'applying');
      expect(applying).toBeDefined();
      expect(applying.extensionCount).toBe(1);

      const complete = shapeEvents.find((e) => e.event === 'complete');
      expect(complete).toBeDefined();
      expect(complete.extensionCount).toBe(1);
      expect(complete.originalLength).toBe(5);
    });
  });

  describe('extendBundle', () => {
    it('should extend a bundle with LLM-suggested extensions', async () => {
      const exts = [mockExtension(), mockExtension({ id: 'nfr-pii', slot: 'pii_rules' })];
      vi.mocked(llm).mockResolvedValueOnce(exts);

      const b = promptBundle.createBundle('Extract entities.');
      const result = await extendBundle(b);

      expect(result.extensions).toEqual(exts);
      expect(result.base).toBe('Extract entities.');
    });

    it('should forward config to extendPrompt', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      const b = promptBundle.createBundle('Test.');
      await extendBundle(b, { suggestions: 'add context', llm: 'fastGood' });

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('<suggestions>');
      expect(callPrompt).toContain('add context');
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ llm: 'fastGood' })
      );
    });

    it('should merge with existing extensions in the bundle', async () => {
      const existing = mockExtension({ id: 'ctx-old', slot: 'old_data' });
      const suggested = mockExtension({ id: 'ctx-new', slot: 'new_data' });
      vi.mocked(llm).mockResolvedValueOnce([suggested]);

      const b = promptBundle.addExtensions(promptBundle.createBundle('Task.'), [existing]);
      const result = await extendBundle(b);

      expect(result.extensions).toHaveLength(2);
      expect(result.extensions.map((e) => e.id).sort()).toEqual(['ctx-new', 'ctx-old']);
    });
  });

  describe('shapeBundle', () => {
    it('should extend a bundle and return both bundle and built prompt', async () => {
      const exts = [mockExtension({ id: 'ctx-domain', preamble: 'Domain: {{medical_terms}}' })];
      vi.mocked(llm).mockResolvedValueOnce(exts);

      const b = promptBundle.createBundle('Extract entities.');
      const result = await shapeBundle(b);

      // Returns the extended bundle
      expect(result.bundle.extensions).toEqual(exts);
      expect(result.bundle.base).toBe('Extract entities.');

      // Returns the built prompt string
      expect(result.prompt).toContain('Extract entities.');
      expect(result.prompt).toContain('Domain: {{medical_terms}}');
      expect(result.prompt).toContain('<!-- marker:ctx-domain -->');
    });

    it('should include filled bindings in the built prompt', async () => {
      const exts = [mockExtension({ id: 'ctx-a', preamble: 'Terms: {{medical_terms}}' })];
      vi.mocked(llm).mockResolvedValueOnce(exts);

      const b = promptBundle.bind(promptBundle.createBundle('Task.'), {
        medical_terms: 'glossary',
      });
      const result = await shapeBundle(b);

      // Bindings from the original bundle carry through
      expect(result.prompt).toContain('glossary');
    });

    it('should forward config to extendPrompt', async () => {
      vi.mocked(llm).mockResolvedValueOnce([]);

      await shapeBundle(promptBundle.createBundle('Test.'), {
        suggestions: 'add context',
        llm: 'fastGood',
      });

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('<suggestions>');
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ llm: 'fastGood' })
      );
    });
  });

  describe('describeBundle', () => {
    it('should describe a bundle and attach the description', async () => {
      const desc = {
        purpose: 'Extracts entities',
        inputs: 'Medical text',
        outputs: 'Entity list',
        qualities: ['domain-aware'],
        gaps: ['No confidence scores'],
      };
      vi.mocked(llm).mockResolvedValueOnce(desc);

      const b = promptBundle.createBundle('Extract entities.');
      const result = await describeBundle(b);

      expect(result.description).toEqual(desc);
      expect(result.base).toBe('Extract entities.');
    });

    it('should build the prompt from the bundle before describing', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: '',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      const b = promptBundle.bind(
        promptBundle.addExtensions(promptBundle.createBundle('Task.'), [
          mockExtension({ preamble: 'Context: {{medical_terms}}' }),
        ]),
        { medical_terms: 'glossary data' }
      );

      await describeBundle(b);

      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('glossary data');
      expect(callPrompt).toContain('Task.');
    });

    it('should forward config to describePrompt', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: '',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      await describeBundle(promptBundle.createBundle('Test.'), { llm: 'fastGood' });

      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ llm: 'fastGood' })
      );
    });
  });

  describe('.with() pipe helpers', () => {
    it('extendPrompt.with should pre-apply config', async () => {
      vi.mocked(llm).mockResolvedValueOnce([mockExtension()]);

      const extend = extendPrompt.with({ suggestions: 'add context', maxExtensions: 2 });
      const result = await extend('Test prompt.');

      expect(result).toHaveLength(1);
      const callPrompt = llm.mock.calls[0][0];
      expect(callPrompt).toContain('add context');
      expect(callPrompt).toContain('at most 2');
    });

    it('shapePrompt.with should pre-apply config', async () => {
      vi.mocked(llm).mockResolvedValueOnce([
        mockExtension({ id: 'ctx-a', preamble: 'Context: {{terms}}' }),
      ]);

      const shape = shapePrompt.with({ maxExtensions: 1 });
      const result = await shape('Extract entities.');

      expect(result.prompt).toContain('Extract entities.');
      expect(result.prompt).toContain('Context: {{terms}}');
      expect(result.extensions).toHaveLength(1);
    });

    it('describePrompt.with should pre-apply config', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: 'test',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      const describe = describePrompt.with({ llm: 'fastGood' });
      const result = await describe('Test.');

      expect(result.purpose).toBe('test');
      expect(llm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ llm: 'fastGood' })
      );
    });

    it('extendBundle.with should pre-apply config', async () => {
      vi.mocked(llm).mockResolvedValueOnce([mockExtension()]);

      const extend = extendBundle.with({ maxExtensions: 1 });
      const result = await extend(promptBundle.createBundle('Task.'));

      expect(result.extensions).toHaveLength(1);
    });

    it('shapeBundle.with should pre-apply config', async () => {
      vi.mocked(llm).mockResolvedValueOnce([mockExtension()]);

      const shape = shapeBundle.with({ maxExtensions: 1 });
      const result = await shape(promptBundle.createBundle('Task.'));

      expect(result.bundle.extensions).toHaveLength(1);
      expect(result.prompt).toContain('Task.');
    });

    it('describeBundle.with should pre-apply config', async () => {
      vi.mocked(llm).mockResolvedValueOnce({
        purpose: 'entity extraction',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      const describe = describeBundle.with({ llm: 'fastGood' });
      const result = await describe(promptBundle.createBundle('Extract entities.'));

      expect(result.description.purpose).toBe('entity extraction');
    });

    it('should compose through pipe: create → extend → describe → build', async () => {
      const extensions = [
        mockExtension({ id: 'ctx-domain', preamble: 'Domain: {{medical_terms}}' }),
      ];
      const description = {
        purpose: 'Medical entity extraction',
        inputs: 'Clinical text',
        outputs: 'Entity list',
        qualities: ['domain-aware'],
        gaps: ['No confidence scores'],
      };

      vi.mocked(llm).mockResolvedValueOnce(extensions).mockResolvedValueOnce(description);

      const result = await pipe(
        promptBundle.createBundle('Extract entities from medical text.'),
        extendBundle.with({ maxExtensions: 1 }),
        describeBundle.with({}),
        promptBundle.buildPrompt
      );

      // Final result is a prompt string with extensions applied and bindings filled
      expect(typeof result).toBe('string');
      expect(result).toContain('Extract entities from medical text.');
      expect(result).toContain('Domain: {{medical_terms}}');
      expect(result).toContain('<!-- marker:ctx-domain -->');

      // Two LLM calls: extend then describe
      expect(llm).toHaveBeenCalledTimes(2);
    });
  });
});
