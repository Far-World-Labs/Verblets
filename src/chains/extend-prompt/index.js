import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { extractSections, insertSections, listSlots } from '../../lib/prompt-markers/index.js';
import * as bundle from '../../lib/prompt-bundle/index.js';
import { emitStepProgress, emitComplete } from '../../lib/progress-callback/index.js';
import { debug } from '../../lib/debug/index.js';
import { extensionsSchema, promptDescriptionSchema } from './schema.js';

// ── LLM Prompt ───────────────────────────────────────────────────────

const systemPrompt = `You are a prompt engineering advisor. You analyze prompts and produce structured extension options — concrete text preambles that can be inserted to improve the prompt.

Each extension has a single {{slot_name}} placeholder for content a human or system must provide later. Extensions are returned in priority order — the ordering IS the ranking.

Common extension types (use whatever label fits):
- context: Domain data, reference text, source material the prompt should incorporate
- output: Output format constraints, schemas, conformance rules, structure requirements
- alignment: Few-shot examples, scoring anchors, calibration data, reference outputs
- construction: Data that informs prompt wording — used to build phrasing, not injected as blocks
- nfr: Non-functional requirements — privacy, determinism, precision, latency, cost
- composition: I/O patterns for batch processing, chaining, or compositional workflows
- side-effect: External integrations, logging, audit trails, or observable effects

Rules:
- Return extensions sorted by overall priority (best first)
- Preambles must be succinct and self-contained — they will be inserted verbatim
- Each preamble must clearly enumerate its integrations, inputs, outputs, or side-effects
- Use exactly one {{slot_name}} per preamble; use a descriptive slot name
- If a complex need has multiple inputs, combine them into one slot or suggest separate extensions
- The rationale should convey priority, impact, feasibility, and tradeoffs — no numeric scores
- The produces field must describe what downstream consumers gain when this extension is applied and its slot is filled — output quality changes, format guarantees, behavioral shifts, or new capabilities
- If the prompt already has markers, update or replace them rather than duplicating`;

const buildUserPrompt = (prompt, { suggestions, existing, maxExtensions }) => {
  const parts = [asXML(prompt, { tag: 'prompt' })];

  if (suggestions.length) {
    const suggestionsText = suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    parts.push(asXML(suggestionsText, { tag: 'suggestions' }));
  }

  if (existing.length) {
    const existingText = existing.map((e) => `- ${e.id}: ${e.content.slice(0, 200)}`).join('\n');
    parts.push(
      `${asXML(existingText, { tag: 'existing-extensions' })}\nThese extensions are already integrated. You may update, replace, or suggest new ones, but do not duplicate.`
    );
  }

  parts.push(
    `Analyze this prompt and return at most ${maxExtensions} structured extension options, sorted by priority.`
  );

  return parts.join('\n\n');
};

// ── Apply / Resolve Extensions ───────────────────────────────────────

export const applyExtensions = (prompt, extensions) =>
  insertSections(
    prompt,
    extensions.map((ext) => ({
      id: ext.id,
      placement: ext.placement,
      content: ext.preamble,
    }))
  );

export const resolveExtensions = (prompt, extensions) => {
  const { sections } = extractSections(prompt);
  const appliedIds = new Set(sections.map((s) => s.id));
  const unfilled = listSlots(prompt);

  return extensions.map((ext) => {
    if (!appliedIds.has(ext.id)) return { ...ext, status: 'pending' };
    if (unfilled.includes(ext.slot)) return { ...ext, status: 'unfilled' };
    return { ...ext, status: 'filled' };
  });
};

// ── Main Chain Function ──────────────────────────────────────────────

const DEFAULT_MAX_EXTENSIONS = 5;

const normalizeSuggestions = (suggestions) => {
  if (!suggestions) return [];
  if (typeof suggestions === 'string') return [suggestions];
  return suggestions;
};

const extendPrompt = async (prompt, config = {}) => {
  const {
    suggestions: rawSuggestions,
    maxExtensions = DEFAULT_MAX_EXTENSIONS,
    llm,
    maxAttempts = 3,
    onProgress,
    abortSignal,
    now = new Date(),
    ...rest
  } = config;

  const suggestions = normalizeSuggestions(rawSuggestions);
  const { clean, sections: existing } = extractSections(prompt);

  emitStepProgress(onProgress, 'extend-prompt', 'analyzing', {
    existingExtensions: existing.length,
    suggestions: suggestions.length,
    maxExtensions,
    now: new Date(),
    chainStartTime: now,
  });

  const userPrompt = buildUserPrompt(clean, { suggestions, existing, maxExtensions });
  const cappedSystemPrompt = `${systemPrompt}\n- Return at most ${maxExtensions} extensions`;

  const response = await retry(
    () =>
      callLlm(userPrompt, {
        llm,
        modelOptions: {
          systemPrompt: cappedSystemPrompt,
          response_format: {
            type: 'json_schema',
            json_schema: extensionsSchema,
          },
        },
        ...rest,
      }),
    {
      label: 'extend-prompt',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

  debug(
    `extend-prompt: generated ${response.length} extensions for prompt (${clean.length} chars)`
  );

  emitComplete(onProgress, 'extend-prompt', {
    extensionCount: response.length,
    extensionIds: response.map((e) => e.id),
    now: new Date(),
    chainStartTime: now,
  });

  return response;
};

// ── Describe Prompt ──────────────────────────────────────────────────

const describeSystemPrompt = `You are a prompt analysis expert. You examine prompts and describe their I/O contract, quality characteristics, and gaps.

The prompt may contain <!-- marker:id --> sections — these are structured extensions providing domain context, format constraints, examples, or other enhancements.

The prompt may contain {{slot_name}} placeholders — these are unfilled slots where data has not yet been connected.

Analyze what the prompt currently does with its existing extensions and filled slots. Do not speculate about what unfilled slots might contain — report them as gaps if they are critical.

Rules:
- purpose: Describe the prompt's core function clearly and specifically
- inputs: What data does this prompt expect to operate on
- outputs: What shape, format, and content does the prompt produce
- qualities: Observable characteristics — things the output demonstrably has (e.g. "uses medical terminology", "excludes PII", "produces JSON")
- gaps: Concrete weaknesses — missing coverage, ambiguities, risks, unfilled critical slots`;

export const describePrompt = async (prompt, config = {}) => {
  const { llm, maxAttempts = 3, onProgress, abortSignal, now = new Date(), ...rest } = config;

  emitStepProgress(onProgress, 'describe-prompt', 'analyzing', {
    promptLength: prompt.length,
    now: new Date(),
    chainStartTime: now,
  });

  const userPrompt = `${asXML(prompt, { tag: 'prompt' })}\n\nDescribe this prompt's purpose, I/O contract, quality characteristics, and gaps.`;

  const response = await retry(
    () =>
      callLlm(userPrompt, {
        llm,
        modelOptions: {
          systemPrompt: describeSystemPrompt,
          response_format: {
            type: 'json_schema',
            json_schema: promptDescriptionSchema,
          },
        },
        ...rest,
      }),
    {
      label: 'describe-prompt',
      maxAttempts,
      onProgress,
      abortSignal,
    }
  );

  debug(`describe-prompt: purpose="${response.purpose}", ${response.gaps.length} gaps`);

  emitComplete(onProgress, 'describe-prompt', {
    gapCount: response.gaps.length,
    qualityCount: response.qualities.length,
    now: new Date(),
    chainStartTime: now,
  });

  return response;
};

// ── One-shot Convenience ─────────────────────────────────────────────
// Like scaleItem: generates spec (extensions) AND applies in one call.

export const shapePrompt = async (prompt, config = {}) => {
  const { onProgress, now = new Date(), ...rest } = config;

  emitStepProgress(onProgress, 'shape-prompt', 'extending', {
    now: new Date(),
    chainStartTime: now,
  });

  const extensions = await extendPrompt(prompt, { onProgress, now, ...rest });

  emitStepProgress(onProgress, 'shape-prompt', 'applying', {
    extensionCount: extensions.length,
    now: new Date(),
    chainStartTime: now,
  });

  const shaped = applyExtensions(prompt, extensions);

  debug(
    `shape-prompt: applied ${extensions.length} extensions (${prompt.length} → ${shaped.length} chars)`
  );

  emitComplete(onProgress, 'shape-prompt', {
    extensionCount: extensions.length,
    originalLength: prompt.length,
    shapedLength: shaped.length,
    now: new Date(),
    chainStartTime: now,
  });

  return { prompt: shaped, extensions };
};

// ── Bundle bridges ──────────────────────────────────────────────────
// *Prompt functions operate on strings. *Bundle functions operate on bundles.
// Both are pipe-friendly (target as first argument).

export const extendBundle = async (b, config = {}) => {
  const { now = new Date(), ...rest } = config;
  const prompt = bundle.buildPrompt(b);
  const extensions = await extendPrompt(prompt, { now, ...rest });
  return bundle.addExtensions(b, extensions);
};

export const shapeBundle = async (b, config = {}) => {
  const { now = new Date(), ...rest } = config;
  const extended = await extendBundle(b, { now, ...rest });
  return { bundle: extended, prompt: bundle.buildPrompt(extended) };
};

export const describeBundle = async (b, config = {}) => {
  const { now = new Date(), ...rest } = config;
  const prompt = bundle.buildPrompt(b);
  const description = await describePrompt(prompt, { now, ...rest });
  return bundle.setDescription(b, description);
};

// ── Pipe helpers (.with) ─────────────────────────────────────────────
// Pre-apply config so the function becomes unary for use with pipe().
// Follows the same convention as map.with(), filter.with(), score.with().

extendPrompt.with = function (config = {}) {
  return (prompt) => extendPrompt(prompt, config);
};

shapePrompt.with = function (config = {}) {
  return (prompt) => shapePrompt(prompt, config);
};

describePrompt.with = function (config = {}) {
  return (prompt) => describePrompt(prompt, config);
};

extendBundle.with = function (config = {}) {
  return (b) => extendBundle(b, config);
};

shapeBundle.with = function (config = {}) {
  return (b) => shapeBundle(b, config);
};

describeBundle.with = function (config = {}) {
  return (b) => describeBundle(b, config);
};

export default extendPrompt;
