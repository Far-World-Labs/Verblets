# Pieces & Graph Algorithms — How Prompts Become Data

> For humans who want to understand what prompt-piece and prompt-routing actually do, starting from the simplest possible picture and adding detail. Read as far as you need.

---

## Level 0: The One-Sentence Version

A **piece** is a prompt that declares what it needs. **Graph algorithms** connect pieces by matching what one produces with what another needs — automatically, through routing tags.

---

## Level 1: What Problem This Solves

Normally a prompt is a string. You build it, send it to an LLM, done. But what if your prompt needs external data — domain context, examples, upstream output? And what if that data comes from *another* LLM call?

You could manage this yourself:

```js
const entities = await llm('Extract entities from this text...');
const prompt = `Given these entities: ${entities}\n\nDescribe the relationships.`;
const relations = await llm(prompt);
```

That works for two steps. But it doesn't scale — you're manually wiring outputs to inputs, there's no way to inspect what's connected, and if you change one step you have to trace everything downstream by hand.

Pieces and graph algorithms make this declarative instead of manual. Connections are derived from **routing tags** — you describe what a piece needs and what it produces, and the algorithms figure out who connects to whom.

---

## Level 2: Pieces Explained

A piece is two things:

```
text:    "Describe the relationships between these entities."
inputs:  [{ id: 'ctx-entities', label: 'Entities', placement: 'prepend',
             tags: ['output', 'entities'], required: true, multi: false }]
```

**text** — The core prompt. The thing you're asking the LLM to do.

**inputs** — Named insertion points where external data goes. Each has:
- `id` — unique key
- `placement` — before or after the core text
- `tags` — routing tags that describe what data this input needs
- `required` — whether the piece can't run without this data
- `multi` — whether this input accepts multiple sources

### The Lifecycle

```
createPiece("Describe relationships.")
    │
    ▼
addInput(piece, { id: 'ctx-entities', tags: ['output', 'entities'], ... })
    │
    ▼  Now the piece declares it needs entity data
    │
matchSources(piece.inputs, sources)
    │
    ▼  Pure tag matching returns which sources fit which inputs
    │
render(piece, { 'ctx-entities': 'Alice, Bob' })
    │
    ▼  Produces a complete prompt string:
```

```
<!-- marker:ctx-entities -->
Alice, Bob
<!-- /marker:ctx-entities -->

Describe the relationships between these entities.
```

### Key Intuition

The piece declares **what it needs** (inputs with routing tags). The app decides **what to provide** (content map from sources). `render()` is the moment you collapse that into a concrete prompt string.

---

## Level 3: Tag Matching — How Sources Find Inputs

Instead of declaring explicit edges ("output of A goes to slot X of B"), the system derives connections from routing tags:

```js
matchSources(piece.inputs, sources, pinned)
```

**AND semantics**: If an input has tags `['medical', 'glossary']`, a source must have *both* `medical` and `glossary` tags to qualify.

**Single vs multi**:
- Single-valued inputs resolve only when exactly 1 source qualifies. Multiple candidates = ambiguous (requires human review).
- Multi-valued inputs accept all qualifying sources in stable order.

**Pinned inputs are skipped** — manual overrides are preserved.

This is the key design: edges are implicit, not explicit. You don't wire A→B. You describe what each piece needs and what sources provide, and `matchSources` figures out the wiring.

---

## Level 4: Rendering — Piece + Content → Prompt String

`render(piece, contentByInput)` produces an execution-ready prompt:

```js
const prompt = render(piece, { 'ctx-terms': 'cephalalgia: headache' });
```

- Inputs present in `contentByInput` → inserted as marker sections at their declared placement
- Inputs not present → skipped entirely
- Empty string content → placeholder `{input-id}`
- Array content (multi-valued) → joined with double newlines

Uses `insertSections` from prompt-markers under the hood.

---

## Level 5: Inspection

Three pure functions let you inspect piece state:

```js
pendingInputs(piece, contentByInput)  // → required input IDs without content
isReady(piece, contentByInput)        // → all required inputs have content?
ambiguousInputs(inputs, sources)      // → single-valued inputs with multiple candidates
```

These help the app decide whether a piece can be rendered, and where human intervention is needed.

---

## Level 6: Graph Algorithms

`prompt-routing` provides pure algorithmic building blocks. No network object — just arrays of edges and names.

**Edge derivation** from instance descriptors:

```js
const instances = [
  { name: 'extractor', sourceTags: ['output', 'entities'], inputs: [] },
  { name: 'analyzer', sourceTags: [], inputs: analyzerPiece.inputs },
];
const edges = promptConnectParts(instances);
// → [{ from: 'extractor', to: 'analyzer', inputId: 'ctx-entities' }]
```

**Topological sort** for execution order:

```js
const order = promptRunOrder(['extractor', 'analyzer'], edges);
// → ['extractor', 'analyzer']  (dependencies first)
```

**Transitive traversal**:

```js
promptConnectDownstream(edges, 'extractor')  // → ['analyzer'] (downstream)
promptConnectUpstream(edges, 'analyzer')    // → ['extractor'] (upstream)
```

**Cycle detection**:

```js
const { valid, errors } = promptDetectCycles(names, edges);
```

All functions take plain arrays and return plain values. The app builds its own network data structures on top of these.

---

## Level 7: The AI Operations

Five focused LLM operations (in `src/chains/extend-prompt/`) help manage pieces and routing tags. All five share a `createAdvisor` factory that extracts the repeated config/progress/retry/callLlm skeleton; each advisor only provides its system prompt, schema, and a `buildParts` function:

| Operation | Input | Output | Purpose |
|-----------|-------|--------|---------|
| `promptPieceReshape` | piece text + context | input changes + text suggestions | What structural improvements does this piece need? |
| `promptPieceProposeTags` | piece + inputs | routing tags per input | How should sources match to inputs? |
| `promptTagSource` | source text + context | routing tags for source | What does this source provide? |
| `promptTagReconcile` | mismatched source + input | repair recommendation | Fix tag mismatches from manual overrides |
| `promptTagConsolidate` | tag registry summary | merges, deprecations, renames | Keep the tag registry clean over time |

All are advisory — they return proposals that the caller decides whether to apply. Nothing auto-applies.

---

## Level 8: How the Pieces Fit Together

```
prompt-markers    prompt-piece      prompt-routing    extend-prompt
─────────────     ────────────      ──────────────    ─────────────
extractSections   (not used)        (not used)        (not used)
insertSections ← render()
listSlots         (_test only)
fillSlots         (_test only)

                  createPiece
                  addInput
                  removeInput
                  render          ← uses insertSections
                  matchSources
                  pendingInputs
                  isReady
                  ambiguousInputs

                                   promptConnectParts      ← takes instance descriptors
                                   promptRunOrder          ← takes (names, edges)
                                   promptConnectDownstream ← takes (edges, names)
                                   promptConnectUpstream   ← takes (edges, names)
                                   promptDetectCycles      ← takes (names, edges)

                                                     promptPieceReshape
                                                     promptPieceProposeTags
                                                     promptTagSource
                                                     promptTagReconcile
                                                     promptTagConsolidate
```

Arrows show dependency direction. Markers are the foundation — piece uses `insertSections` for rendering. Graph provides pure algorithms over edges and names. The AI operations are independent — they return proposals, not side effects.

---

## Library vs App Boundary

The library provides **pure building blocks**:
- Piece construction and rendering (prompt-piece)
- Tag matching algorithms (prompt-piece)
- Edge derivation, topological sort, impact analysis (prompt-routing)
- AI advisory operations (extend-prompt)

The **app** manages:
- Instance lifecycle (current output, staleness, source tags)
- Network collections (which instances exist, their names)
- Execution orchestration (running in order, wiring outputs to inputs)
- Staleness propagation and incremental re-execution
- Pinning and manual overrides

This boundary exists because verblets is a prompt chaining library — state management and orchestration belong to the consuming application.

---

## Scenarios

### "I have a prompt and want to know what it needs"

```js
const { inputChanges, textSuggestions } = await promptPieceReshape('Extract medical entities from the text.', {
  maxChanges: 3,
});
// inputChanges: proposed additions, removals, modifications with rationales
// textSuggestions: proposed text edits to improve the piece
```

### "I want to build a piece from proposed changes"

```js
let piece = createPiece('Extract medical entities.');
for (const change of inputChanges.filter(c => c.action === 'add')) {
  piece = addInput(piece, {
    id: change.id, label: change.label,
    placement: change.placement, tags: change.suggestedTags,
    required: change.required, multi: change.multi,
  });
}
```

### "I have sources and want to know what matches"

```js
const sources = [
  { id: 'glossary', tags: ['medical', 'glossary'], content: '...' },
  { id: 'examples', tags: ['medical', 'examples'], content: '...' },
];
const matches = matchSources(piece.inputs, sources);
const contentByInput = Object.fromEntries(
  Object.entries(matches).map(([id, ms]) => [id, ms.map((m) => m.content)])
);
const prompt = render(piece, contentByInput);
```

### "I have a multi-step pipeline and need execution order"

```js
// App builds instance descriptors from its own state
const instances = [
  { name: 'extract', sourceTags: ['output', 'entities'], inputs: [] },
  { name: 'analyze', sourceTags: [], inputs: analyzerPiece.inputs },
];
const edges = promptConnectParts(instances);
const order = promptRunOrder(instances.map((i) => i.name), edges);
// App runs instances in this order, wiring outputs to inputs
```
