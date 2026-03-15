import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import reshape, { tagSource } from './advisors.js';
import * as promptPiece from './piece.js';
import * as promptRouting from './routing.js';
import { longTestTimeout, shouldRunLongExamples } from '../../constants/common.js';
import { wrapIt, wrapExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Extend-prompt chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Extend-prompt chain' } })
  : vitestExpect;

describe.skipIf(!shouldRunLongExamples)('extend-prompt examples', () => {
  it(
    'should reshape a medical extraction prompt with structural proposals',
    async () => {
      const prompt = `Extract all named entities from the following medical text.
Return each entity with its type (person, condition, medication, procedure) and the exact text span.`;

      const result = await reshape(prompt, { maxChanges: 3 });

      expect(result.inputChanges).toBeDefined();
      expect(result.textSuggestions).toBeDefined();
      expect(result.inputChanges.length).toBeGreaterThanOrEqual(1);
      expect(result.inputChanges.length).toBeLessThanOrEqual(3);

      for (const change of result.inputChanges) {
        expect(['add', 'remove', 'modify']).toContain(change.action);
        expect(change.id).toBeTruthy();
        expect(change.rationale).toBeTruthy();
        expect(Array.isArray(change.suggestedTags)).toBe(true);
      }
    },
    longTestTimeout
  );

  it(
    'should tag medical glossary source content',
    async () => {
      const tags = await tagSource({
        text: 'cephalalgia: headache\nedema: swelling\ntachycardia: rapid heart rate',
        kind: 'output',
        registry: [
          { tag: 'medical', description: 'Medical domain content', usageCount: 5 },
          { tag: 'glossary', description: 'Terminology glossary', usageCount: 3 },
        ],
      });

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThanOrEqual(1);

      for (const t of tags) {
        expect(t.tag).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(t.confidence);
        expect(typeof t.needsReview).toBe('boolean');
        expect(t.rationale).toBeTruthy();
      }
    },
    longTestTimeout
  );
});

describe.skipIf(!shouldRunLongExamples)('extend-prompt lifecycle examples', () => {
  it(
    'should demonstrate the full reshape → build piece → match → render lifecycle',
    async () => {
      const prompt = 'Classify customer support tickets by urgency and department.';

      // 1. Reshape: discover what the piece needs
      const { inputChanges } = await reshape(prompt, { maxChanges: 2 });
      const additions = inputChanges.filter((c) => c.action === 'add');
      expect(additions.length).toBeGreaterThanOrEqual(1);

      // 2. Build a piece with proposed inputs
      let piece = promptPiece.createPiece(prompt);
      for (const change of additions) {
        piece = promptPiece.addInput(piece, {
          id: change.id,
          label: change.label,
          placement: change.placement,
          tags: change.suggestedTags,
          required: change.required,
          multi: change.multi,
        });
      }

      // 3. Check readiness
      expect(promptPiece.isReady(piece)).toBe(additions.every((a) => !a.required));

      // 4. Match sources via tag routing
      if (additions[0].suggestedTags.length > 0) {
        const sources = [
          {
            id: 'sample-source',
            tags: additions[0].suggestedTags,
            content: 'Sample data for the first input',
          },
        ];
        const matches = promptPiece.matchSources(piece.inputs, sources);
        const content = Object.fromEntries(
          Object.entries(matches).map(([inputId, mappings]) => [
            inputId,
            mappings.map((m) => m.content).filter(Boolean),
          ])
        );

        // 5. Render the piece with matched content
        const rendered = promptPiece.render(piece, content);
        expect(rendered).toContain('Classify customer support');
      }
    },
    longTestTimeout
  );
});

describe.skipIf(!shouldRunLongExamples)('prompt-routing pipeline example', () => {
  it(
    'should execute a two-step pipeline with tag-based wiring',
    async () => {
      const llm = (await import('../llm/index.js')).default;

      const extractorPiece = promptPiece.createPiece(
        'Extract all person names and organizations from this text: "Dr. Sarah Chen at Stanford Medical Center published findings with collaborator James Wu from the Mayo Clinic."'
      );

      const relPiece = promptPiece.addInput(
        promptPiece.createPiece('Describe the professional relationships between these entities.'),
        {
          id: 'ctx-entities',
          label: 'Entities',
          placement: 'prepend',
          tags: ['output', 'entities'],
          required: true,
          multi: false,
        }
      );

      // Derive connections from tag matching (app provides instance descriptors)
      const instances = [
        { name: 'extractor', sourceTags: ['output', 'entities'], inputs: [] },
        { name: 'relations', sourceTags: [], inputs: relPiece.inputs },
      ];

      const edges = promptRouting.connectParts(instances);
      expect(edges.length).toBeGreaterThanOrEqual(1);
      expect(edges[0].from).toBe('extractor');
      expect(edges[0].to).toBe('relations');

      // Validate acyclic
      const names = instances.map((i) => i.name);
      const { valid } = promptRouting.detectCycles(names, edges);
      expect(valid).toBe(true);

      // Execute in dependency order (app orchestration)
      const order = promptRouting.runOrder(names, edges);
      const results = {};

      for (const name of order) {
        if (name === 'extractor') {
          results[name] = await llm(promptPiece.render(extractorPiece));
        } else if (name === 'relations') {
          const rendered = promptPiece.render(relPiece, {
            'ctx-entities': results.extractor,
          });
          results[name] = await llm(rendered);
        }
      }

      const extractorResult = results.extractor.toLowerCase();
      expect(extractorResult.includes('sarah') || extractorResult.includes('chen')).toBe(true);
      expect(results.relations).toBeTruthy();
      expect(results.relations.length).toBeGreaterThan(10);
    },
    longTestTimeout
  );
});
