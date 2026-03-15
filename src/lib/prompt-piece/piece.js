// ── Prompt Pieces ───────────────────────────────────────────────────
// A piece is a prompt template with declared inputs.
// All functions are pure — no mutation, no runtime state.
//
// The app manages its own state (which pieces exist, their outputs,
// staleness, pinning, routing). This module provides:
// - Piece construction (what a prompt needs)
// - Rendering (piece + content → prompt string)
// - Tag matching (which sources fit which inputs)
// - Inspection (what's missing, what's ambiguous)
//
// Piece shape:
// { text: string, inputs: Input[] }
//
// Input shape:
// { id: string, label: string, placement: 'prepend'|'append',
//   tags: string[], required: boolean, multi: boolean }

import { insertSections } from './markers.js';

// ── Piece operations ────────────────────────────────────────────────

export const createPiece = (text) => ({
  text,
  inputs: [],
});

export const addInput = (piece, input) => ({
  ...piece,
  inputs: [
    ...piece.inputs.filter((i) => i.id !== input.id),
    {
      id: input.id,
      label: input.label ?? input.id,
      placement: input.placement ?? 'prepend',
      tags: input.tags ?? [],
      required: input.required ?? false,
      multi: input.multi ?? false,
    },
  ],
});

export const removeInput = (piece, inputId) => ({
  ...piece,
  inputs: piece.inputs.filter((i) => i.id !== inputId),
});

// ── Rendering ───────────────────────────────────────────────────────
// Produces an execution-ready prompt string from a piece and content.
// content: Record<inputId, string | string[]>
//   - string: single content value
//   - string[]: multiple values (joined with double newline)
//
// Inputs not present in content are skipped (not inserted).

export const render = (piece, content = {}) => {
  const sections = piece.inputs
    .filter((input) => input.id in content)
    .map((input) => {
      const raw = content[input.id];
      const body = Array.isArray(raw) ? raw.filter(Boolean).join('\n\n') : raw;
      return {
        id: input.id,
        placement: input.placement,
        content: body || `{${input.id}}`,
      };
    });

  return insertSections(piece.text, sections);
};

// ── Tag matching ────────────────────────────────────────────────────
// Pure function: given inputs and available sources, returns
// which sources match which inputs based on routing tags.
//
// sources: Array<{ id: string, tags: string[], content?: string }>
//
// AND semantics: a source qualifies when it has ALL of an input's tags.
// Single-valued inputs: resolved only when exactly 1 source qualifies.
// Multi-valued inputs: all qualifying sources in stable order.
//
// Returns Record<inputId, Array<{ sourceId: string, content?: string }>>

const sourceQualifies = (source, input) =>
  input.tags.length > 0 && input.tags.every((t) => source.tags.includes(t));

export const matchSources = (inputs, sources, pinned = new Set()) => {
  const matches = {};

  for (const input of inputs) {
    if (pinned.has(input.id)) continue;
    if (input.tags.length === 0) continue;

    const candidates = sources.filter((s) => sourceQualifies(s, input));

    if (input.multi) {
      if (candidates.length > 0) {
        matches[input.id] = candidates.map((s) => ({
          sourceId: s.id,
          content: s.content,
        }));
      }
    } else if (candidates.length === 1) {
      matches[input.id] = [
        {
          sourceId: candidates[0].id,
          content: candidates[0].content,
        },
      ];
    }
    // 0 or >1 candidates for single-valued: unresolved
  }

  return matches;
};

// ── Inspection ──────────────────────────────────────────────────────

export const pendingInputs = (piece, content = {}) =>
  piece.inputs.filter((input) => input.required && !(input.id in content)).map((input) => input.id);

export const isReady = (piece, content = {}) => pendingInputs(piece, content).length === 0;

export const ambiguousInputs = (inputs, sources, pinned = new Set()) =>
  inputs
    .filter((input) => {
      if (input.multi) return false;
      if (pinned.has(input.id)) return false;
      if (input.tags.length === 0) return false;
      return sources.filter((s) => sourceQualifies(s, input)).length > 1;
    })
    .map((input) => ({
      inputId: input.id,
      candidates: sources.filter((s) => sourceQualifies(s, input)).map((s) => s.id),
    }));

// ── Test utilities ──────────────────────────────────────────────────

const inspectPiece = (piece) => ({
  text: piece.text,
  inputCount: piece.inputs.length,
  inputIds: piece.inputs.map((i) => i.id),
  requiredInputs: piece.inputs.filter((i) => i.required).map((i) => i.id),
  multiInputs: piece.inputs.filter((i) => i.multi).map((i) => i.id),
});

const diffPieces = (before, after) => ({
  textChanged: before.text !== after.text,
  inputsAdded: after.inputs.filter((i) => !before.inputs.some((b) => b.id === i.id)),
  inputsRemoved: before.inputs.filter((i) => !after.inputs.some((b) => b.id === i.id)),
});

export const _test = { inspectPiece, diffPieces };
