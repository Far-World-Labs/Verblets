# Spec: Prompt Piece — Structure Discovery and Reshape

## Terminology

| Term | Meaning |
| --- | --- |
| **Piece** | Reusable source text that may later execute or supply material to other pieces |
| **Input area** | A named insertion point on a piece where external material can be provided |
| **Routing tag** | A tag used for AND-matching sources to input areas |
| **Mapping** | A resolved connection from a source into an input area |
| **Sealed piece** | A fully rendered piece with all required inputs resolved |

## Architecture

### AI advisor: `reshape`

Single LLM call that analyzes prompt text and proposes structural improvements. Nothing auto-applies — all output is proposal data.

**Modes** (selected via `config.mode`):

| Mode | Default | Returns | Use case |
| --- | --- | --- | --- |
| `'edits'` | Yes | `{ inputChanges[], textEdits[] }` | Full analysis: structural input proposals + machine-applicable text edits |
| `'diagnostic'` | No | `{ diagnostics[] }` | Issues only, no fixes — cheaper, good for long prompts or triage |

**Input**: string (piece text) or structured object:
- `text` — the piece text to analyze
- `inputs` — existing input areas on the piece
- `registry` — approved routing tag summary with usage counts
- `sources` — local source examples relevant to this piece
- `note` — optional manual guidance

**Config**:
- `maxChanges` — cap on proposals returned (default 5)
- `mode` — `'edits'` (default) or `'diagnostic'`
- `untrusted` — harden against prompt injection in piece content
- `llm`, `onProgress`, `abortSignal` — standard advisor options
- `.with(config)` — partial application for reuse

**Suggestion model**:

Each text edit carries an issue-fix pair with anchor-based positioning:
```
{
  id: 'clarify-extraction-scope',       // kebab-case, stable across re-runs
  category: 'clarity',                   // freeform (clarity, structure, specificity, tone, ...)
  issue: { description, severity },      // severity: critical | important | nice-to-have
  fix: { near, find, replace, rationale } // anchor-based: near locates, find matches, replace changes
}
```

Diagnostics have the same shape minus `fix`. Input changes propose add/remove/modify with optional `suggestedTags` for routing.

### Test helpers (not public API)

`test-helpers.js` provides lightweight piece construction, rendering, tag matching, and pipeline routing used by tests. These functions implement the deterministic core behaviors described in the terminology section:

- `createPiece`, `addInput` — piece construction
- `render` — sealed piece rendering with marker-based section injection
- `matchSources` — AND-matching tag resolution
- `pendingInputs`, `isReady` — readiness inspection
- `connectParts`, `runOrder`, `detectCycles` — pipeline wiring and topological ordering

### Prompt fragments (`src/prompts/prompt-piece.js`)

Reusable prompt text encoding domain concepts for prompt structure analysis. These fragments are consumed by the reshape advisor and will be consumed by UI components that need the same vocabulary:

- `inputSlotTaxonomy` — categories of input areas a prompt can declare
- `tagMatchingSemantics` — AND-matching rule explanation
- `tagSelectionGuidance` — how to choose good routing tags
- `classifyByRole` — tag by what content provides, not what it's about
- `tagRepairStrategies` — three strategies for fixing tag mismatches
- `registryHygiene` — guidance for maintaining tag vocabulary over time
- `untrustedSystemSuffix`, `untrustedBoundary` — injection defense markers

## Public API

```js
import { reshape } from './index.js';

// Default (edits mode): structural changes + text edits
const { inputChanges, textEdits } = await reshape(promptText, { maxChanges: 3 });

// Diagnostic mode: issues only
const { diagnostics } = await reshape(promptText, { mode: 'diagnostic' });

// Partial application
const diagnose = reshape.with({ mode: 'diagnostic', maxChanges: 5 });
const result = await diagnose(promptText);
```

## Schemas

Defined in `schemas.js`. Follow the verblets convention: `value{}` wrapper for callLlm auto-unwrap.

| Export | Schema name | Mode |
| --- | --- | --- |
| `reshapeEditsSchema` | `prompt_piece_reshape_edits` | edits (default) |
| `reshapeDiagnosticSchema` | `prompt_piece_reshape_diagnostic` | diagnostic |
