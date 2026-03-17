import { describe, it, expect } from 'vitest';
import {
  createPiece,
  addInput,
  render,
  matchSources,
  isReady,
  pendingInputs,
  extractSections,
  connectParts,
  detectCycles,
  runOrder,
} from './test-helpers.js';

describe('prompt piece composition', () => {
  it('builds a multi-input piece, matches sources by tags, and renders a coherent prompt', () => {
    // A real scenario: medical entity extraction with domain context and examples
    let piece = createPiece('Extract all named entities from the following medical text.');
    piece = addInput(piece, {
      id: 'ctx-terminology',
      label: 'Medical Terminology',
      placement: 'prepend',
      tags: ['medical', 'glossary'],
      required: true,
      multi: false,
    });
    piece = addInput(piece, {
      id: 'ctx-examples',
      label: 'Few-shot Examples',
      placement: 'append',
      tags: ['medical', 'examples'],
      required: false,
      multi: true,
    });

    // Before providing content, only the required input is pending
    expect(pendingInputs(piece)).toEqual(['ctx-terminology']);
    expect(isReady(piece)).toBe(false);

    // Tag routing: sources match inputs by AND semantics
    const sources = [
      {
        id: 'glossary-1',
        tags: ['medical', 'glossary'],
        content: 'cephalalgia: headache\nedema: swelling',
      },
      {
        id: 'example-1',
        tags: ['medical', 'examples'],
        content: 'Input: chest pain → Output: { type: "condition", text: "chest pain" }',
      },
      {
        id: 'example-2',
        tags: ['medical', 'examples'],
        content: 'Input: Dr. Smith → Output: { type: "person", text: "Dr. Smith" }',
      },
      {
        id: 'unrelated',
        tags: ['legal', 'glossary'],
        content: 'Should not match — missing "medical" tag',
      },
    ];

    const matches = matchSources(piece.inputs, sources);

    // Single-valued input: exactly one glossary source qualifies
    expect(matches['ctx-terminology']).toHaveLength(1);
    expect(matches['ctx-terminology'][0].sourceId).toBe('glossary-1');

    // Multi-valued input: both example sources qualify
    expect(matches['ctx-examples']).toHaveLength(2);
    expect(matches['ctx-examples'].map((m) => m.sourceId)).toEqual(['example-1', 'example-2']);

    // Unrelated source never matched
    const allMatchedIds = Object.values(matches).flatMap((ms) => ms.map((m) => m.sourceId));
    expect(allMatchedIds).not.toContain('unrelated');

    // Render: content injected as marker sections in correct positions
    const content = Object.fromEntries(
      Object.entries(matches).map(([id, mappings]) => [id, mappings.map((m) => m.content)])
    );
    const rendered = render(piece, content);

    // Prepended terminology appears before the task text
    const termPos = rendered.indexOf('cephalalgia');
    const taskPos = rendered.indexOf('Extract all named');
    const examplePos = rendered.indexOf('chest pain');
    expect(termPos).toBeLessThan(taskPos);
    expect(taskPos).toBeLessThan(examplePos);

    // Round-trip: markers can be extracted back out
    const { clean, sections } = extractSections(rendered);
    expect(clean).toBe('Extract all named entities from the following medical text.');
    expect(sections).toHaveLength(2);
    expect(sections.map((s) => s.id)).toEqual(['ctx-terminology', 'ctx-examples']);
  });

  it('wires a three-step pipeline and computes correct execution order', () => {
    // Pipeline: parse → enrich → summarize
    // parsePiece has no inputs — it's a root node
    const enrichPiece = addInput(createPiece('Add context to each section.'), {
      id: 'ctx-sections',
      label: 'Parsed Sections',
      placement: 'prepend',
      tags: ['output', 'sections'],
      required: true,
      multi: false,
    });
    const summarizePiece = addInput(
      addInput(createPiece('Produce a final summary.'), {
        id: 'ctx-enriched',
        label: 'Enriched Sections',
        placement: 'prepend',
        tags: ['output', 'enriched'],
        required: true,
        multi: false,
      }),
      {
        id: 'ctx-original',
        label: 'Original Sections',
        placement: 'append',
        tags: ['output', 'sections'],
        required: false,
        multi: false,
      }
    );

    const instances = [
      { name: 'parse', sourceTags: ['output', 'sections'], inputs: [] },
      { name: 'enrich', sourceTags: ['output', 'enriched'], inputs: enrichPiece.inputs },
      { name: 'summarize', sourceTags: [], inputs: summarizePiece.inputs },
    ];

    const edges = connectParts(instances);

    // parse → enrich (sections), parse → summarize (sections), enrich → summarize (enriched)
    expect(edges).toHaveLength(3);
    expect(edges).toContainEqual({ from: 'parse', to: 'enrich', inputId: 'ctx-sections' });
    expect(edges).toContainEqual({ from: 'parse', to: 'summarize', inputId: 'ctx-original' });
    expect(edges).toContainEqual({ from: 'enrich', to: 'summarize', inputId: 'ctx-enriched' });

    const { valid } = detectCycles(
      instances.map((i) => i.name),
      edges
    );
    expect(valid).toBe(true);

    const order = runOrder(
      instances.map((i) => i.name),
      edges
    );
    expect(order.indexOf('parse')).toBeLessThan(order.indexOf('enrich'));
    expect(order.indexOf('enrich')).toBeLessThan(order.indexOf('summarize'));
  });
});
