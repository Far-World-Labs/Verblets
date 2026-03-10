import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import extendPrompt, {
  applyExtensions,
  resolveExtensions,
  shapePrompt,
  describePrompt,
} from './index.js';
import { fillSlots } from '../../lib/prompt-markers/index.js';
import * as promptBundle from '../../lib/prompt-bundle/index.js';
import * as promptGraph from '../../lib/prompt-graph/index.js';
import { longTestTimeout, shouldRunLongExamples } from '../../constants/common.js';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Extend-prompt chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Extend-prompt chain' } })
  : vitestExpect;

describe.skipIf(!shouldRunLongExamples)('extend-prompt examples', () => {
  it(
    'should analyze a prompt and suggest structured extensions',
    async () => {
      const prompt = `Extract all named entities from the following medical text.
Return each entity with its type (person, condition, medication, procedure) and the exact text span.`;

      const extensions = await extendPrompt(prompt, {
        suggestions: ['add domain terminology', 'specify output format'],
        maxExtensions: 3,
      });

      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThanOrEqual(1);
      expect(extensions.length).toBeLessThanOrEqual(3);

      // Each extension has the full structure
      for (const ext of extensions) {
        expect(ext.id).toBeTruthy();
        expect(ext.type).toBeTruthy();
        expect(['prepend', 'append']).toContain(ext.placement);
        expect(ext.preamble).toBeTruthy();
        expect(ext.slot).toBeTruthy();
        expect(ext.need).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(ext.effort);
        expect(ext.rationale).toBeTruthy();
        expect(ext.produces).toBeTruthy();

        // Preamble contains the slot placeholder
        expect(ext.preamble).toContain(`{{${ext.slot}}}`);
      }

      // Extensions are usable — apply them to the prompt
      const shaped = applyExtensions(prompt, extensions);
      expect(shaped).toContain('Extract all named entities');

      for (const ext of extensions) {
        expect(shaped).toContain(`<!-- marker:${ext.id} -->`);
      }
    },
    longTestTimeout
  );

  it(
    'should shape a prompt end-to-end with shapePrompt',
    async () => {
      const original = `Summarize the key findings from this clinical trial report.
Focus on efficacy outcomes, adverse events, and statistical significance.`;

      const result = await shapePrompt(original, {
        suggestions: ['add output format constraints'],
        maxExtensions: 2,
      });

      // Returns shaped prompt and extensions as data
      expect(result.prompt).toContain('Summarize the key findings');
      expect(Array.isArray(result.extensions)).toBe(true);

      // Extensions can be reapplied to a different prompt
      const otherPrompt = 'Analyze the safety profile from this Phase III trial.';
      const reshaped = applyExtensions(otherPrompt, result.extensions);
      expect(reshaped).toContain('Analyze the safety profile');

      // Extensions from the original carry over
      for (const ext of result.extensions) {
        expect(reshaped).toContain(`<!-- marker:${ext.id} -->`);
      }
    },
    longTestTimeout
  );

  it(
    'should describe a prompt I/O contract',
    async () => {
      const prompt = `You are a medical coding assistant. Given a clinical note, extract all ICD-10 codes that apply.

Return a JSON array where each element has:
- code: The ICD-10 code (e.g., "J06.9")
- description: The standard description
- evidence: The text span from the note supporting this code`;

      const description = await describePrompt(prompt);

      expect(description.purpose).toBeTruthy();
      expect(description.inputs).toBeTruthy();
      expect(description.outputs).toBeTruthy();
      expect(Array.isArray(description.qualities)).toBe(true);
      expect(Array.isArray(description.gaps)).toBe(true);

      // Purpose should mention coding or extraction
      const purposeLower = description.purpose.toLowerCase();
      expect(
        purposeLower.includes('code') ||
          purposeLower.includes('extract') ||
          purposeLower.includes('icd')
      ).toBe(true);
    },
    longTestTimeout
  );
});

describe.skipIf(!shouldRunLongExamples)('extend-prompt lifecycle examples', () => {
  it(
    'should demonstrate the full spec → apply → resolve → fill lifecycle',
    async () => {
      const prompt = 'Classify customer support tickets by urgency and department.';

      // 1. Generate extensions (spec)
      const extensions = await extendPrompt(prompt, { maxExtensions: 2 });
      expect(extensions.length).toBeGreaterThanOrEqual(1);

      // 2. Apply extensions to the prompt
      const shaped = applyExtensions(prompt, extensions);
      expect(shaped).toContain('Classify customer support');

      // 3. Resolve — all slots are unfilled
      const resolved = resolveExtensions(shaped, extensions);
      expect(resolved.every((r) => r.status === 'unfilled')).toBe(true);

      // 4. Fill a slot
      const firstSlot = extensions[0].slot;
      const filled = fillSlots(shaped, {
        [firstSlot]: 'Sample data for the first extension slot',
      });

      // 5. Resolve again — first slot is now filled
      const resolvedAfterFill = resolveExtensions(filled, extensions);
      expect(resolvedAfterFill[0].status).toBe('filled');
      if (extensions.length > 1) {
        expect(resolvedAfterFill[1].status).toBe('unfilled');
      }

      // 6. Reuse extensions on another prompt
      const anotherPrompt = 'Prioritize bug reports by severity.';
      const anotherShaped = applyExtensions(anotherPrompt, extensions);
      expect(anotherShaped).toContain('Prioritize bug reports');
    },
    longTestTimeout
  );

  it(
    'should demonstrate bundle-based prompt management',
    async () => {
      // Create a bundle
      const bundle = promptBundle.createBundle('Extract action items from meeting transcripts.');

      // Extend with LLM-suggested extensions
      const prompt = promptBundle.buildPrompt(bundle);
      const extensions = await extendPrompt(prompt, { maxExtensions: 2 });
      const extended = promptBundle.addExtensions(bundle, extensions);

      // Check status — all pending
      const pendingSlots = promptBundle.pendingSlots(extended);
      expect(pendingSlots.length).toBe(extensions.length);

      // Fill one slot
      const filled = promptBundle.bind(extended, {
        [extensions[0].slot]: 'Meeting context data',
      });

      // Build the final prompt
      const finalPrompt = promptBundle.buildPrompt(filled);
      expect(finalPrompt).toContain('Extract action items');
      expect(finalPrompt).toContain('Meeting context data');

      // Status shows mix of filled and unfilled
      const statuses = promptBundle.extensionStatus(filled);
      expect(statuses[0].status).toBe('filled');
      if (extensions.length > 1) {
        expect(statuses[1].status).toBe('unfilled');
      }
    },
    longTestTimeout
  );
});

describe.skipIf(!shouldRunLongExamples)('prompt-graph execution example', () => {
  it(
    'should execute a two-prompt pipeline with data wiring',
    async () => {
      const llm = (await import('../../lib/llm/index.js')).default;

      // Node A: entity extractor
      const extractorBundle = promptBundle.createBundle(
        'Extract all person names and organizations from this text: "Dr. Sarah Chen at Stanford Medical Center published findings with collaborator James Wu from the Mayo Clinic."'
      );

      // Node B: relationship builder (takes entities from A)
      const relBundle = promptBundle.addExtensions(
        promptBundle.createBundle(
          'Describe the professional relationships between these entities.'
        ),
        [
          {
            id: 'ctx-entities',
            type: 'context',
            placement: 'prepend',
            preamble: 'Entities found:\n{{entities}}',
            slot: 'entities',
            need: 'Entity list from upstream extraction',
            effort: 'low',
            rationale: 'Required input for relationship analysis.',
            produces: 'Enables relationship discovery between known entities.',
          },
        ]
      );

      let graph = promptGraph.createGraph();
      graph = promptGraph.addNode(graph, 'extractor', extractorBundle);
      graph = promptGraph.addNode(graph, 'relations', relBundle);
      graph = promptGraph.connect(graph, 'extractor', 'relations', 'entities');

      // Validate before execution
      const { valid } = promptGraph.validate(graph);
      expect(valid).toBe(true);

      // Execute — runner calls real LLM
      const results = await promptGraph.execute(graph, async (name, prompt) => {
        return await llm(prompt);
      });

      // Extractor should find the people and orgs
      const extractorResult = results.extractor.toLowerCase();
      expect(extractorResult.includes('sarah') || extractorResult.includes('chen')).toBe(true);

      // Relations should describe connections
      expect(results.relations).toBeTruthy();
      expect(results.relations.length).toBeGreaterThan(10);
    },
    longTestTimeout
  );
});
