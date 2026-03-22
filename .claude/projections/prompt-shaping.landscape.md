# Prompt Shaping — Landscape

> For humans and machines working on the prompt infrastructure. Companion to `landscape.md`.
> For a progressive, human-first explanation of pieces and graph algorithms: [`bundle-graph.landscape.md`](./bundle-graph.landscape.md).

---

## Two Prompt Systems, Not One

The project has two independent systems for constructing what an LLM sees. They solve different problems, work at different levels, and are not aware of each other.

**The Prompt Workshop** (`src/prompts/`) is 24 modules of prompt-building functions and 120+ string constants. These are the project's battle-tested prompt engineering knowledge, extracted into composable code. Every verblet and most chains import from here. The functions assemble prompt text from structured inputs — they're how the system has always talked to LLMs.

**The Prompt Shaping Layer** (`src/lib/prompt-markers/`, `src/lib/prompt-piece/`, `src/lib/prompt-routing/`, `src/chains/extend-prompt/`) treats prompts as structured data objects with named inputs and routing tags. It provides pure building blocks for a separate UI project that builds networks of prompt invocations with self-adapting qualities. The app manages its own state — the library provides algorithms.

These two systems don't compete. The workshop builds prompt strings from structured arguments for known tasks. The shaping layer provides data structures and algorithms for managing prompt structures over time with declarative routing.

The only place they touch: `extend-prompt` imports `asXML` from `prompts/wrap-variable.js` to wrap its own LLM input.

---

## The Prompt Workshop in Detail

### Architecture

The workshop has three tiers:

**Constants** (`constants.js`) — 50+ string constants organized by purpose: output format directives (`asBool`, `asJSON`, `onlyJSONStringArray`), content headers (`contentIsMain`, `contentIsSortCriteria`), response steering (`strictFormat`, `noFabrication`), reasoning instructions (`thinkStepByStep`, `explainReasoning`), self-critique prompts (`rateConfidence`, `rewriteIfWeak`), depth modifiers (`considerProsCons`, `provideExamples`). These are the atoms — individual sentences that instruct an LLM.

**Wrapping utilities** (`wrap-variable.js`, `wrap-list.js`) — Smart formatters that decide how to present data to an LLM. `wrapVariable` auto-selects XML tags for multiline content and quotes for inline. `asXML` is the most-imported function in the project's prompt layer — used by 15+ prompt modules and directly by `extend-prompt`. `wrapList` formats arrays with numbered items inside XML.

**Assembler functions** (20 modules) — Each takes structured arguments and produces a complete prompt string by composing constants and wrappers. They range from one-liners (`asEnum`: format choices) to multi-section assemblers (`sort`: criteria + content + order + fixes in semantic XML).

### Consumption

55 files import from `prompts/`. Every verblet uses at least one prompt module. The constants are the most widely shared — `onlyJSON` and `asXML` appear in dozens of call sites. The assembler functions are typically used by exactly one chain or verblet each.

The workshop is also exported wholesale from `shared.js` as `prompts`, making all constants and functions available to consumers of the library.

---

## The Prompt Shaping Layer in Detail

### Layer 1: Markers (`src/lib/prompt-markers/`)

Pure text surgery on prompt strings. Four public functions:

- **`extractSections(prompt)`** → `{ clean, sections: [{ id, content }] }` — Parses `<!-- marker:id -->` delimited sections out of a prompt, returns the clean core and extracted sections.
- **`insertSections(prompt, sections)`** → `string` — Strips existing markers, then inserts sections at prepend/append positions. Idempotent: re-inserting with the same id replaces.
- **`listSlots(prompt)`** → `string[]` — Finds all `{slot_name}` placeholders. Deduplicated. (`_test` export only)
- **`fillSlots(prompt, bindings)`** → `string` — Replaces `{slot_name}` with values. Unmatched slots left intact. (`_test` export only)

Two conventions make this work:
- Markers use HTML comments (`<!-- marker:id -->`) — invisible to LLMs, parseable by tools.
- Slots use single braces (`{name}`) — the same convention as `template-replace`.

`_test` exports: `inspectPrompt` (extract + listSlots combined), `diffPrompts` (section-level diff between two prompts).

### Layer 2: Pieces (`src/lib/prompt-piece/`)

Pure data model for prompt management. All functions return new objects — no mutation.

**Piece** — A prompt template with declared inputs:
```
{ text: string, inputs: Input[] }
```

**Input** — A named insertion point with routing tags:
```
{ id, label, placement: 'prepend'|'append', tags: string[], required: boolean, multi: boolean }
```

**Construction:**
- `createPiece(text)` — create a bare piece
- `addInput(piece, input)` — add/replace an input (applies defaults)
- `removeInput(piece, inputId)` — remove by id

**Rendering:**
- `render(piece, contentByInput)` — produce prompt string via `insertSections`. Inputs in `contentByInput` get marker sections; absent inputs are skipped; empty strings become placeholders.

**Tag matching (AND semantics):**
- `matchSources(inputs, sources, pinned)` → `Record<inputId, Array<{ sourceId, content }>>` — a source qualifies when it has ALL of an input's tags. Single-valued inputs resolve only with exactly 1 candidate; multi-valued accept all; pinned inputs are skipped.

**Inspection:**
- `pendingInputs(piece, contentByInput)` → required input IDs without content
- `isReady(piece, contentByInput)` → all required inputs have content?
- `ambiguousInputs(inputs, sources, pinned)` → single-valued inputs with multiple candidates

`_test` exports: `inspectPiece` (uses `inputCount`, `inputIds`, `requiredInputs`, `multiInputs`), `diffPieces` (uses `inputsAdded`, `inputsRemoved`).

### Layer 3: Graph Algorithms (`src/lib/prompt-routing/`)

Pure algorithmic building blocks for network orchestration. All functions take plain arrays and return plain values — the app builds its own network data structures on top.

**Connection functions:**
- `promptConnectParts(instances)` → `[{ from, to, inputId }]` — instances are `{ name, sourceTags, inputs, pinned? }`. Edges derived from tag matching across all instances.
- `promptConnectUpstream(edges, names)` → upstream names (BFS)
- `promptConnectDownstream(edges, names)` → downstream names (BFS)

**Planning functions:**
- `promptRunOrder(names, edges)` → `string[]` — Kahn's algorithm. Nodes in cycles are excluded.
- `promptDetectCycles(names, edges)` → `{ valid, errors }` — checks for cycles

### Layer 4: AI Operations (`src/chains/extend-prompt/`)

Five focused LLM operations built on a shared `createAdvisor` factory that extracts the repeated config/progress/retry/callLlm skeleton. Each advisor only provides its system prompt, schema, and a `buildParts` function. All are advisory — they return proposals, nothing auto-applies.

**Piece advisors** (advise on prompt structure):

| Operation | Input schema | Output schema | Purpose |
|-----------|-------------|---------------|---------|
| `promptPieceReshape` | piece text + context | `value{inputChanges[], textSuggestions[]}` | Propose structural improvements to a piece |
| `promptPieceProposeTags` | piece + inputs | `items[]` | Recommend routing tags for inputs |

**Tag advisors** (advise on routing tags):

| Operation | Input schema | Output schema | Purpose |
|-----------|-------------|---------------|---------|
| `promptTagSource` | source text + context | `items[]` | Assign routing tags to sources |
| `promptTagReconcile` | mismatched source + input | `value{}` | Fix tag mismatches from manual overrides |
| `promptTagConsolidate` | tag registry summary | `value{}` | Keep tags stable and small over time |

All five have `.with(config)` for pipe composition.

**promptTagReconcile** input fields: `inputLabel`, `inputTags`, `inputGuidance`.

**promptPieceReshape** output schema: `inputChanges` (with `change-input-tags` action type).

**Schemas** use the standard `items`/`value` wrapper convention for structured output.

---

## Library vs App Boundary

The shaping layer provides pure building blocks. The consuming app manages:

| Library provides | App manages |
|-----------------|-------------|
| Piece construction, rendering | Instance lifecycle (output, staleness) |
| Tag matching algorithms | Source tag assignment per instance |
| Edge derivation, topo sort | Network collections, instance naming |
| Impact/dependency analysis | Execution orchestration |
| Cycle validation | Staleness propagation, incremental re-execution |
| AI advisory operations | Pinning, manual override persistence |

This boundary exists because verblets is a prompt chaining library. State management and orchestration belong to the consuming application.

---

## Public API Surface

From `shared.js`:

| Export | Kind | Source |
|--------|------|--------|
| `promptPieceReshape` (default) | async chain | extend-prompt |
| `promptPieceProposeTags` | async chain | extend-prompt |
| `promptTagSource` | async chain | extend-prompt |
| `promptTagReconcile` | async chain | extend-prompt |
| `promptTagConsolidate` | async chain | extend-prompt |
| `promptMarkers` | namespace | prompt-markers (full module) |
| `promptPiece` | namespace | prompt-piece (full module) |
| `promptRouting` | namespace | prompt-routing (full module) |
| `prompts` | namespace | prompts/ (full workshop) |

The chain functions are top-level named exports. The library modules are namespace exports — consumers use `promptPiece.createPiece()`, `promptRouting.promptConnectParts()`, etc.

---

## Dataflow

```
                          LLM
                           ↑
         promptPieceReshape / promptTagSource / ...
                    ↑              ↑
              piece text      source text
                    ↑
              (advisory — returns proposals)

    ────── App-level orchestration ──────

    App builds instance descriptors from its own state
         ↓
    promptConnectParts(instances) → edges
         ↓
    promptRunOrder(names, edges) → execution order
         ↓
    for each name in order:
         ↓
    matchSources → render → runner → store output

    ────── AI advisory (single LLM calls) ──────

         promptPieceReshape / promptTagSource / ...
                    ↑              ↑
              piece text      source text
                    ↑
              (advisory — returns proposals)
```

Key dataflow invariant: upstream outputs flow through tag matching. Source tags describe what a step produces; input tags describe what a step needs. The library derives edges; the app orchestrates execution.
