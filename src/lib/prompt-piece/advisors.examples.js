import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import vitestAiExpect from '../../chains/expect/index.js';
import llm from '../llm/index.js';
import reshape from './advisors.js';
import {
  createPiece,
  addInput,
  render,
  matchSources,
  isReady,
  pendingInputs,
  connectParts,
  detectCycles,
  runOrder,
} from './test-helpers.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { getConfig } from '../../chains/test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Prompt piece' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Prompt piece' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Prompt piece' } })
  : vitestAiExpect;

// ── reshape ─────────────────────────────────────────────────────────

describe('reshape', () => {
  const medicalNerPrompt = `Extract all named entities from the following medical text.
Return each entity with its type (person, condition, medication, procedure) and the exact text span.`;

  it(
    'proposes domain-relevant inputs for a medical NER prompt',
    { timeout: longTestTimeout },
    async () => {
      const result = await reshape(medicalNerPrompt, { maxChanges: 3 });

      expect(result.inputChanges.length).toBeGreaterThanOrEqual(1);
      expect(result.inputChanges.length).toBeLessThanOrEqual(3);

      const ids = result.inputChanges.map((c) => c.id);
      const rationales = result.inputChanges.map((c) => c.rationale).join('\n');

      const idsPass = await aiExpect({ prompt: medicalNerPrompt, ids }).toSatisfy(
        'Each id is kebab-case and plausibly relates to the prompt (which is about medical named entity extraction). Ids should suggest domain context, examples, output constraints, or similar — not be generic like "input-1" or completely unrelated to the prompt.',
        { mode: 'none' }
      );
      expect(idsPass).toBe(true);

      const rationalesPass = await aiExpect({ prompt: medicalNerPrompt, rationales }).toSatisfy(
        'Each rationale explains how the proposed input specifically improves the given prompt — e.g. reduces ambiguity about entity types, adds domain knowledge for medical text, constrains output format. Not vague platitudes that could apply to any prompt.',
        { mode: 'none' }
      );
      expect(rationalesPass).toBe(true);
    }
  );

  it(
    'respects existing inputs and avoids duplicating them',
    { timeout: longTestTimeout },
    async () => {
      const result = await reshape({
        text: 'Classify support tickets by urgency.',
        inputs: [
          {
            id: 'ctx-categories',
            placement: 'prepend',
            tags: ['support', 'categories'],
            required: true,
            multi: false,
          },
        ],
        maxChanges: 3,
      });

      const proposedIds = result.inputChanges.filter((c) => c.action === 'add').map((c) => c.id);

      const noOverlap = await aiExpect(proposedIds).toSatisfy(
        'None of these ids duplicate or trivially restate "ctx-categories". They propose genuinely different concerns like examples, escalation rules, or output format.',
        { mode: 'none' }
      );
      expect(noOverlap).toBe(true);
    }
  );

  it(
    'returns machine-applicable text edits in edits mode',
    { timeout: longTestTimeout },
    async () => {
      const editsPrompt = `Extract all named entities from the following medical text.
Return each entity with its type and the exact text span.`;

      const result = await reshape(editsPrompt, { mode: 'edits', maxChanges: 3 });

      expect(result.textEdits.length).toBeGreaterThanOrEqual(1);
      expect(result.textEdits.length).toBeLessThanOrEqual(3);

      for (const edit of result.textEdits) {
        expect(edit.id).toMatch(/^[a-z][a-z0-9-]*$/);
        expect(edit.category).toBeTruthy();
        expect(['critical', 'important', 'nice-to-have']).toContain(edit.issue.severity);
        expect(edit.fix.find).toBeTruthy();
        expect(edit.fix.replace).toBeTruthy();
        expect(edit.fix.near).toBeTruthy();
      }

      const editsPass = await aiExpect({
        prompt: editsPrompt,
        textEdits: result.textEdits,
      }).toSatisfy(
        'Each edit has: (a) an issue describing a real problem with the given prompt, (b) a fix where "find" is a substring that actually appears verbatim in the prompt text, and (c) a "replace" that is a concrete improvement over the found text. The "near" field describes where in the prompt the edit applies.',
        { mode: 'none' }
      );
      expect(editsPass).toBe(true);
    }
  );

  it(
    'returns diagnostics without fixes in diagnostic mode',
    { timeout: longTestTimeout },
    async () => {
      const diagPrompt = 'Summarize the document.';

      const result = await reshape(diagPrompt, {
        mode: 'diagnostic',
        maxChanges: 5,
      });

      expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);

      for (const diag of result.diagnostics) {
        expect(diag.id).toMatch(/^[a-z][a-z0-9-]*$/);
        expect(diag.category).toBeTruthy();
        expect(['critical', 'important', 'nice-to-have']).toContain(diag.issue.severity);
        expect(diag).not.toHaveProperty('fix');
      }

      const diagPass = await aiExpect({
        prompt: diagPrompt,
        diagnostics: result.diagnostics,
      }).toSatisfy(
        'Each diagnostic identifies a real issue with the given prompt — e.g. vague task, no output format, no length constraint, no domain context. Issues are specific to this prompt (not generic advice). Ordered by severity.',
        { mode: 'none' }
      );
      expect(diagPass).toBe(true);
    }
  );
});

// ── full lifecycle with LLM ────────────────────────────────────────

describe('prompt piece lifecycle (LLM)', () => {
  it(
    'reshapes a prompt, builds a piece, wires sources, and renders an executable prompt',
    { timeout: longTestTimeout },
    async () => {
      const taskText = 'Summarize the key findings from this research paper.';

      // 1. AI advisor: discover what inputs the piece should have
      const { inputChanges } = await reshape(taskText, { maxChanges: 3 });
      const additions = inputChanges.filter((c) => c.action === 'add');
      expect(additions.length).toBeGreaterThanOrEqual(1);

      // 2. Build the piece from proposals
      let piece = createPiece(taskText);
      for (const change of additions) {
        piece = addInput(piece, {
          id: change.id,
          label: change.label,
          placement: change.placement,
          tags: change.suggestedTags,
          required: change.required,
          multi: change.multi,
        });
      }

      // 3. Verify readiness reflects required inputs
      const pending = pendingInputs(piece);
      const requiredAdditions = additions.filter((a) => a.required);
      expect(pending.length).toBe(requiredAdditions.length);
      expect(isReady(piece)).toBe(requiredAdditions.length === 0);

      // 4. Match sources via tag routing
      const firstInput = piece.inputs[0];
      const sources = [
        {
          id: 'test-source',
          tags: firstInput.tags,
          content:
            'The study found a 34% reduction in error rates when using structured prompts versus free-form instructions.',
        },
      ];
      const matches = matchSources(piece.inputs, sources);
      expect(matches[firstInput.id]).toBeDefined();

      // 5. Render with matched content
      const content = Object.fromEntries(
        Object.entries(matches).map(([id, mappings]) => [id, mappings.map((m) => m.content)])
      );
      const rendered = render(piece, content);

      const renderedPass = await aiExpect(rendered).toSatisfy(
        'This is a valid LLM prompt that: (a) contains the original task about summarizing research findings, (b) includes the source content about 34% error rate reduction, (c) reads as a coherent prompt a human could send to an LLM.',
        { mode: 'none' }
      );
      expect(renderedPass).toBe(true);
    }
  );

  it(
    'routes a two-step pipeline and produces coherent output',
    { timeout: longTestTimeout },
    async () => {
      // Step 1: entity extraction piece
      const extractPiece = createPiece(
        'Extract all person names and organizations from this text: "Dr. Sarah Chen at Stanford Medical Center published findings with collaborator James Wu from the Mayo Clinic."'
      );

      // Step 2: relationship analysis piece, depends on extracted entities
      const relPiece = addInput(
        createPiece('Describe the professional relationships between these entities.'),
        {
          id: 'ctx-entities',
          label: 'Extracted Entities',
          placement: 'prepend',
          tags: ['output', 'entities'],
          required: true,
          multi: false,
        }
      );

      // Wire: the extractor's output tags match the relation piece's input tags
      const instances = [
        { name: 'extractor', sourceTags: ['output', 'entities'], inputs: [] },
        { name: 'relations', sourceTags: [], inputs: relPiece.inputs },
      ];

      const edges = connectParts(instances);
      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({ from: 'extractor', to: 'relations', inputId: 'ctx-entities' });

      const { valid } = detectCycles(
        instances.map((i) => i.name),
        edges
      );
      expect(valid).toBe(true);

      // Execute in dependency order
      const order = runOrder(
        instances.map((i) => i.name),
        edges
      );
      expect(order).toEqual(['extractor', 'relations']);

      const results = {};
      results.extractor = await llm(render(extractPiece));
      results.relations = await llm(render(relPiece, { 'ctx-entities': results.extractor }));

      // Verify extraction found the right entities
      const extractPass = await aiExpect(results.extractor).toSatisfy(
        'Mentions at least Sarah Chen, James Wu, Stanford Medical Center, and Mayo Clinic — the four named entities in the input text.',
        { mode: 'none' }
      );
      expect(extractPass).toBe(true);

      // Verify relationship analysis uses the extracted entities meaningfully
      const relPass = await aiExpect(results.relations).toSatisfy(
        'Describes professional relationships between the entities: Chen and Wu are collaborators, Chen is at Stanford, Wu is at Mayo Clinic. Should reference specific people and organizations, not speak generically.',
        { mode: 'none' }
      );
      expect(relPass).toBe(true);
    }
  );
});
