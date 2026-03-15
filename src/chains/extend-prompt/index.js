// ── Extend Prompt — AI Advisors ─────────────────────────────────────
// Advisory AI operations for managing prompt pieces and routing tags.
// Each is a single LLM call following the verblets pattern.
// All return proposals — nothing auto-applies.
//
// Piece advisors:
//   reshape      — what inputs should this piece have?
//   proposeTags  — what routing tags should these inputs require?
//
// Tag advisors:
//   tagSource      — what tags describe what this source provides?
//   tagReconcile   — manual override broke tag matching — how to fix?
//   tagConsolidate — merge duplicates, deprecate unused, rename unclear

import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { emitStepProgress, emitComplete } from '../../lib/progress-callback/index.js';
import { debug } from '../../lib/debug/index.js';
import {
  reshapeSchema,
  proposeTagsSchema,
  tagSourceSchema,
  tagReconcileSchema,
  tagConsolidateSchema,
} from './schema.js';

// ── Shared helpers ──────────────────────────────────────────────────

const formatInputs = (inputs) =>
  inputs
    .map(
      (i) =>
        `- ${i.id} (${i.placement}, ${i.required ? 'required' : 'optional'}, ${i.multi ? 'multi' : 'single'}) tags: [${(i.tags ?? []).join(', ')}]`
    )
    .join('\n');

const formatRegistry = (registry) =>
  registry
    .map((t) => {
      const parts = [`- ${t.tag}: ${t.description ?? ''} (${t.usageCount ?? 0} uses)`];
      if (t.examples?.length) parts.push(`  Examples: ${t.examples.slice(0, 3).join(', ')}`);
      return parts.join('\n');
    })
    .join('\n');

// ── Advisor factory ─────────────────────────────────────────────────
// Extracts the repeated skeleton: config destructuring, progress
// events, retry + callLlm, debug logging, .with() composition.
// Each advisor only provides: system prompt, schema, and a buildParts
// function that maps (input, config) → string[] of prompt sections.

const createAdvisor = (label, systemPrompt, schema, buildParts) => {
  const fn = async (input, config = {}) => {
    const { llm, maxAttempts = 3, onProgress, abortSignal, now = new Date(), ...rest } = config;

    emitStepProgress(onProgress, label, 'analyzing', { now: new Date(), chainStartTime: now });

    const parts = buildParts(input, config);

    const response = await retry(
      () =>
        callLlm(parts.join('\n\n'), {
          llm,
          modelOptions: {
            systemPrompt,
            response_format: { type: 'json_schema', json_schema: schema },
          },
          ...rest,
        }),
      { label, maxAttempts, onProgress, abortSignal }
    );

    debug(`${label}: complete`);
    emitComplete(onProgress, label, { now: new Date(), chainStartTime: now });

    return response;
  };

  fn.with =
    (config = {}) =>
    (input) =>
      fn(input, config);
  return fn;
};

// ── Piece advisors ──────────────────────────────────────────────────

const reshapeSystemPrompt = `You are a prompt structure advisor. You analyze prompt text and propose structural improvements — inputs to add, remove, or modify, and text changes to make the piece work better with external material.

Each input is a named insertion point where external material can be provided. Consider:
- Domain context (terminology, reference data, background knowledge)
- Output constraints (format, schema, validation rules)
- Examples (few-shot demonstrations, calibration data)
- Non-functional requirements (privacy, determinism, cost constraints)
- Composition inputs (material from upstream pieces in a pipeline)
- Option choices when structurally useful (categorization, mode selection)

Rules:
- Return changes in priority order (most impactful first)
- Use kebab-case for input ids
- Set required=true only for inputs without which the piece cannot function
- Set multi=true for inputs that naturally accept multiple sources
- Suggest routing tags that would help auto-match sources to each input
- Consider existing inputs — propose removals or modifications when warranted
- When inputs should be split or merged, express as remove + add actions with rationale
- Propose text edits when the piece text should change to accommodate new material`;

export const reshape = createAdvisor(
  'piece-reshape',
  reshapeSystemPrompt,
  reshapeSchema,
  (input, { maxChanges = 5 }) => {
    const {
      text,
      inputs = [],
      registry = [],
      sources = [],
      note,
    } = typeof input === 'string' ? { text: input } : input;

    const parts = [asXML(text, { tag: 'piece-text' })];
    if (inputs.length) parts.push(asXML(formatInputs(inputs), { tag: 'existing-inputs' }));
    if (registry.length) parts.push(asXML(formatRegistry(registry), { tag: 'routing-tags' }));
    if (sources.length) {
      const formatted = sources
        .map((s) => `- [${s.tags?.join(', ') ?? ''}]: ${s.text?.slice(0, 200) ?? s.id ?? ''}`)
        .join('\n');
      parts.push(asXML(formatted, { tag: 'local-sources' }));
    }
    if (note) parts.push(asXML(note, { tag: 'note' }));
    parts.push(
      `Propose at most ${maxChanges} structural changes to this piece, in priority order.`
    );
    return parts;
  }
);

const proposeTagsSystemPrompt = `You are a routing tag advisor. You recommend routing tags for inputs on prompts so that sources can auto-match into them.

Routing tags are simple string labels used for AND-matching: a source must have ALL of an input's tags to qualify. Choose tags that are:
- Specific enough to avoid false matches
- General enough to be reusable across similar inputs
- Consistent with the existing tag registry when possible

Prefer reusing existing tags over creating new ones. Propose a new tag only when no existing tag fits.`;

export const proposeTags = createAdvisor(
  'piece-propose-tags',
  proposeTagsSystemPrompt,
  proposeTagsSchema,
  (input) => {
    const { text, inputs, registry = [] } = input;
    const parts = [
      asXML(text, { tag: 'piece-text' }),
      asXML(formatInputs(inputs), { tag: 'inputs' }),
    ];
    if (registry.length) parts.push(asXML(formatRegistry(registry), { tag: 'existing-tags' }));
    parts.push('Recommend routing tags for each input.');
    return parts;
  }
);

// ── Tag advisors ────────────────────────────────────────────────────

const tagSourceSystemPrompt = `You are a content classification advisor. You assign routing tags to source content (pieces or their outputs) so they can be automatically matched to inputs that need them.

Tags should describe what the content provides, not what it is about. Consider:
- What kind of material this content represents
- Which inputs it could fill
- The existing tag registry — reuse tags when they fit

Return tags in order of confidence (most confident first).`;

export const tagSource = createAdvisor(
  'tag-source',
  tagSourceSystemPrompt,
  tagSourceSchema,
  (input) => {
    const {
      text,
      kind = 'piece',
      registry = [],
      consumerHints = [],
      upstreamContext,
      pieceText,
    } = typeof input === 'string' ? { text: input } : input;

    const parts = [asXML(text, { tag: 'source-text' }), `Source kind: ${kind}`];
    if (kind === 'output' && pieceText) parts.push(asXML(pieceText, { tag: 'producing-piece' }));
    if (kind === 'output' && upstreamContext)
      parts.push(asXML(upstreamContext, { tag: 'upstream-context' }));
    if (registry.length) parts.push(asXML(formatRegistry(registry), { tag: 'existing-tags' }));
    if (consumerHints.length) {
      const hints = consumerHints.map((h) => `- ${h.inputId}: [${h.tags.join(', ')}]`).join('\n');
      parts.push(asXML(hints, { tag: 'consumer-hints' }));
    }
    parts.push('Assign routing tags to this source content.');
    return parts;
  }
);

const reconcileSystemPrompt = `You are a routing alignment repair advisor. A user manually connected a source to an input, but the source's tags don't match the input's required tags.

Recommend ONE of three strategies:
1. add-tag-to-source: Add existing tags to the source so it matches
2. change-input-tags: Change the input's tag requirements
3. new-tag: Create a new tag when neither side fits existing tags (last resort)

Prefer strategies that don't require creating new tags.`;

export const tagReconcile = createAdvisor(
  'tag-reconcile',
  reconcileSystemPrompt,
  tagReconcileSchema,
  (input) => {
    const { sourceText, sourceTags, inputLabel, inputTags, inputGuidance, registry = [] } = input;

    const parts = [
      asXML(sourceText, { tag: 'source-text' }),
      `Source tags: [${sourceTags.join(', ')}]`,
      `Input: "${inputLabel}" requires tags: [${inputTags.join(', ')}]`,
    ];
    if (inputGuidance) parts.push(asXML(inputGuidance, { tag: 'input-guidance' }));
    if (registry.length) parts.push(asXML(formatRegistry(registry), { tag: 'existing-tags' }));
    parts.push('Recommend how to repair this tag mismatch.');
    return parts;
  }
);

const consolidateSystemPrompt = `You are a tag registry maintenance advisor. You analyze a collection of routing tags and propose improvements to keep the registry clean, small, and stable.

Consider:
- Near-duplicate tags that should be merged
- Tags with zero or very low usage that should be deprecated
- Tags with unclear names that should be renamed for clarity
- Tags that have drifted from their original purpose

This is a reduce-style operation — work from summaries, not full content.`;

export const tagConsolidate = createAdvisor(
  'tag-consolidate',
  consolidateSystemPrompt,
  tagConsolidateSchema,
  (input) => {
    const { registry, unresolvedClusters = [] } = input;

    const parts = [asXML(formatRegistry(registry), { tag: 'registry' })];
    if (unresolvedClusters.length) {
      const clusters = unresolvedClusters
        .map((c) => `- [${c.tags.join(', ')}]: ${c.description}`)
        .join('\n');
      parts.push(asXML(clusters, { tag: 'unresolved-clusters' }));
    }
    parts.push('Propose improvements to this routing tag registry.');
    return parts;
  }
);

// ── Exports ─────────────────────────────────────────────────────────

export default reshape;
