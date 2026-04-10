// ── Prompt Piece — Reshape Advisor ──────────────────────────────────
// AI-powered structural analysis of prompt text. Single LLM call,
// returns proposals — nothing auto-applies.

import callLlm, { jsonSchema } from '../llm/index.js';
import retry from '../retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import createProgressEmitter from '../progress/index.js';
import { DomainEvent, Outcome } from '../progress/constants.js';
import { debug } from '../debug/index.js';
import { untrustedSystemSuffix, untrustedBoundary } from '../../prompts/prompt-piece.js';
import { reshapeEditsSchema, reshapeDiagnosticSchema } from './schemas.js';

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
//
// systemPrompt and schema can be functions of (input, config) for
// dynamic selection (e.g. reshape mode parameter).
//
// Config option: untrusted (boolean, default false)
//   When true, hardens the system prompt and prepends a boundary
//   preamble to defend against prompt injection from piece content.

const createAdvisor = (label, systemPrompt, schema, buildParts) => {
  const fn = async (input, config = {}) => {
    const { llm, maxAttempts = 3, onProgress, abortSignal, untrusted = false, ...rest } = config;

    const resolvedSchema = typeof schema === 'function' ? schema(input, config) : schema;
    const resolvedSystemPrompt =
      typeof systemPrompt === 'function' ? systemPrompt(input, config) : systemPrompt;

    const emitter = createProgressEmitter(label, onProgress);
    emitter.start();
    emitter.emit({ event: DomainEvent.step, stepName: 'analyzing' });

    const parts = buildParts(input, config);
    const effectiveSystemPrompt = untrusted
      ? resolvedSystemPrompt + untrustedSystemSuffix
      : resolvedSystemPrompt;
    const effectiveParts = untrusted ? [untrustedBoundary, ...parts] : parts;

    const response = await retry(
      () =>
        callLlm(effectiveParts.join('\n\n'), {
          llm,
          systemPrompt: effectiveSystemPrompt,
          response_format: jsonSchema(resolvedSchema.name, resolvedSchema.schema),
          abortSignal,
          ...rest,
        }),
      { label, maxAttempts, onProgress, abortSignal }
    );

    debug(`${label}: complete`);
    emitter.complete({ outcome: Outcome.success });

    return response;
  };

  fn.with =
    (config = {}) =>
    (input) =>
      fn(input, config);
  return fn;
};

// ── Reshape advisor ────────────────────────────────────────────────

const reshapeSystemPromptBase = `You are a prompt structure advisor. You analyze prompt text and propose structural improvements — inputs to add, remove, or modify, and text changes to make the piece work better with external material.

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

const reshapeEditsAddendum = `

For text changes, propose structured edits with:
- id: kebab-case identifier, stable across re-runs for the same issue
- category: what kind of improvement (clarity, structure, specificity, tone, etc.)
- issue: what's wrong or improvable, with severity (critical, important, nice-to-have)
- fix: a concrete text edit with:
  - near: natural language description locating the region (reference distinctive phrases or structural boundaries)
  - find: the exact text to match
  - replace: the replacement text
  - rationale: why this change improves the piece`;

const reshapeDiagnosticAddendum = `

Identify issues only — do not propose fixes or structural input changes. For each issue:
- id: kebab-case identifier, stable across re-runs for the same issue
- category: what kind of issue (clarity, structure, specificity, tone, etc.)
- issue: what's wrong or improvable, with severity (critical, important, nice-to-have)

Return issues in priority order (most impactful first).`;

const reshapeSchemaForMode = (_input, config) => {
  const { mode } = config;
  if (mode === 'diagnostic') return reshapeDiagnosticSchema;
  return reshapeEditsSchema;
};

const reshapeSystemPromptForMode = (_input, config) => {
  const { mode } = config;
  if (mode === 'diagnostic') return reshapeSystemPromptBase + reshapeDiagnosticAddendum;
  return reshapeSystemPromptBase + reshapeEditsAddendum;
};

export const reshape = createAdvisor(
  'piece-reshape',
  reshapeSystemPromptForMode,
  reshapeSchemaForMode,
  (input, { maxChanges = 5, mode } = {}) => {
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

    const instruction =
      mode === 'diagnostic'
        ? `Identify at most ${maxChanges} issues with this piece, in priority order.`
        : `Propose at most ${maxChanges} structural changes to this piece, in priority order.`;
    parts.push(instruction);
    return parts;
  }
);

// ── Exports ─────────────────────────────────────────────────────────

export default reshape;
