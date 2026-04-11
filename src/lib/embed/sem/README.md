# sem — Semantic State Pipelines

A small library for building, revising, and using multi-projection semantic state from text. Not a RAG library. Not an embeddings wrapper. A system for constructing structured semantic representations that you can read from, match against, and refine over time.

The core idea: don't think "document → chunks → vectors." Think **sources → fragments → states → readouts / matches**.

## Why this exists

Verblets already has embedding utilities for retrieval (embedScore, embedMultiQuery, etc.). Those solve "find similar text." This solves something different: **build a multi-dimensional semantic model of your data, then use it.**

Use cases:
- **Indexing + search**: fragment documents across semantic lanes, match against weighted intent bundles instead of single query vectors
- **Domain model annotation**: attach vector states to database records, read scalar properties (urgency, risk, intent) without LLM calls
- **Fast internal semantics**: privacy-preserving vector operations inside other chains where LLM calls are too heavy or too slow

## The pipeline

```
define → fragment → ingest → read / match
                                ↓
                    inspect → refine → repeat
```

Four phases with hard boundaries:

| Phase | Functions | What happens |
|-------|-----------|-------------|
| Text planning | `define`, `fragment`, `refine` | LLM shapes the semantic plan and decomposes text |
| State assembly | `ingest`, `shapeState` | Vectors are built and edited, no LLM |
| Readout | `planRead`, `read`, `readDetails` | Scalar values recovered from vector states, pure math |
| Matching | `match` | Projection-aware comparison between state sets |

## Core vocabulary

**Source text** — a raw string from your system (a ticket body, a message, a policy page).

**Fragment** — a content unit shaped for one semantic purpose. Not just a chunk. A fragment might be a literal text slice, a recast of the source into a projection's language, a cluster summary, a meta-level observation, or an image. Fragments carry either `text` or `image` (a URL or file path). Every fragment knows where it came from (`sourceIds`) and how it was derived (`fragmentKind`).

**Projection** — a named semantic lane (billing, compliance, timeline, entitlement). Text gets fragmented *into* projections. Vectors get grouped *by* projection. Projections are the structural backbone of the system.

**State** — a bundle of vectors, one per projection. This is what you store, compare, and read from. States are lightweight (just an ID and a map of Float32Arrays) — fragment text stays with the caller.

**Property** — a scalar readout target (urgency, complianceRisk, refundIntent). Properties are recovered from states using weighted projection vectors. They are outputs, not projections.

**Schema** — the text-level plan for a domain: which projections exist, which properties to read, how properties weight across projections. Schemas contain no vectors — they are pure text, stable enough to version, and refined through iteration.

## API

### Text planning (LLM calls)

```js
// Define projections and properties for a domain
const schema = await sem.define({
  exampleTexts: [
    'The invoice is still wrong. Legal thinks the retention language is risky.',
    'Customer wants a refund before launch.',
  ],
  projectionNames: ['billing', 'compliance', 'timeline'],  // optional seeds
  propertyNames: ['urgency', 'complianceRisk'],             // optional seeds
}, config);
```

```js
// Decompose source texts into projection-shaped fragments
const fragmentSets = await sem.fragment({
  sourceTexts: [
    { sourceId: 'ticket:4812', text: 'The invoice is still wrong. Legal thinks the retention language is risky.' },
  ],
  schema,
}, config);
// fragmentSets[0].fragments might include:
//   { text: 'The invoice is still wrong.', projectionName: 'billing', fragmentKind: 'literal' }
//   { text: 'Legal thinks the retention language is risky.', projectionName: 'compliance', fragmentKind: 'literal' }
```

```js
// Refine the schema after observing gaps
const schema2 = await sem.refine({
  schema,
  studySet: {
    selectedStateIds: ['ticket:4812', 'ticket:4921', 'ticket:4993'],
    noteText: 'These cluster together but current properties do not explain why.',
  },
}, config);
```

### State assembly (embedding, no LLM)

```js
// Build vector states from fragments (text-only uses default text model)
const { states, schema: enrichedSchema } = await sem.ingest({ fragmentSets, schema });

// Multimodal: when any fragment has an image, all embedding routes through
// the multimodal model so text and image vectors share the same space
const multimodalFragments = [{
  fragmentSetId: 'fs:product',
  fragments: [
    { fragmentId: 'f1', text: 'Red running shoe, lightweight', projectionName: 'visual', sourceIds: ['product:1'] },
    { fragmentId: 'f2', image: 'https://cdn.example.com/shoe.jpg', projectionName: 'visual', sourceIds: ['product:1'] },
  ],
}];
const { states: multiStates } = await sem.ingest({ fragmentSets: multimodalFragments, schema });
```

```js
// Shape existing states by scaling projection vectors
const edited = sem.shapeState({
  states,
  editsByProjectionName: { compliance: +0.25, tribeAffinity: -0.8 },
});
```

### Readout (pure math, bulk-safe)

```js
// Build a read plan (trivial — schema has defaults)
const readPlan = sem.planRead({
  schema: enrichedSchema,
  propertyNames: ['urgency', 'complianceRisk'],
});

// Read scalar values from states
const values = sem.read({ states, readPlan, schema: enrichedSchema });
// values[0] = { stateId: 'ticket:4812', valuesByPropertyName: { urgency: 0.78, complianceRisk: 0.63 } }

// Or with confidence scores for compositional fallback
const details = sem.readDetails({ states, readPlan, schema: enrichedSchema });
// details[0].valuesByPropertyName.urgency = { value: 0.78, confidence: 0.91 }
```

### Matching (vector math, optionally embeds query texts)

```js
const matches = await sem.match({
  leftStates: ticketStates,
  rightStates: policyStates,
  intent: {
    queryTexts: ['retention language risk', 'enterprise support scope'],
    weightsByProjectionName: { compliance: 1.0, entitlement: 0.9, billing: 0.2 },
    suppressProjectionNames: ['tribeAffinity'],
  },
}, config);
// matches = [{ leftStateId: 'ticket:4812', rightStateId: 'policy:retention', score: 0.91 }, ...]
```

## Fragments are purposeful

`fragment` is not text splitting. It produces projection-shaped semantic units through several derivation modes:

- **literal**: direct slice from source text
- **recast**: source text restated in a projection's language ("Customer is frustrated that enterprise support won't handle this" → entitlement: "The customer believes this issue should qualify for enterprise support handling")
- **cluster**: derived from a brushed selection or study set ("These items frequently imply launch consequences without stating urgency")
- **meta**: policy, tone, or agenda observations lifted from context
- **query**: one part of a multi-part search intent

Every fragment carries `sourceIds` and `fragmentKind` for provenance.

## The revision loop

The real power is iterative refinement:

1. `define` a schema from example texts
2. `fragment` documents into projection-shaped pieces
3. `ingest` fragments into vector states
4. `read` properties, `match` against intent
5. Inspect: which items cluster unexpectedly? Which properties read with low confidence?
6. `refine` the schema with a study set of those items
7. Re-fragment, re-ingest with the updated schema

This loop is the core workflow. The 8 functions exist to serve it.

## Domain model annotation

States are small, serializable, and designed to live alongside database records:

```js
// At write time: build state for a new ticket
const fragmentSets = await sem.fragment({ sourceTexts: [{ sourceId: ticket.id, text: ticket.body }], schema }, config);
const { states } = await sem.ingest({ fragmentSets, schema: enrichedSchema });
await db.tickets.update(ticket.id, { semanticState: states[0] });

// At read time: recover properties without an LLM call
const stored = await db.tickets.findMany({ where: { accountId } });
const values = sem.read({
  states: stored.map(t => t.semanticState),
  readPlan: urgencyPlan,
  schema: enrichedSchema,
});
// Route, prioritize, filter based on values
```

## Embedding model negotiation

Embedding models are selected through a rule-based negotiation system (same pattern as LLM model selection). The default model is CLIP multimodal — text and images share the same vector space.

```js
// Default: CLIP multimodal (text + images in same vector space)
const { states } = await sem.ingest({ fragmentSets, schema });

// Force text-only model (higher quality text embeddings, no image support)
const { states } = await sem.ingest({ fragmentSets, schema }, { embedding: { good: true } });
```

When `ingest` encounters image fragments, it automatically negotiates a multimodal model for all vectors in that batch — you don't need to specify `{ multi: true }` manually.

Custom models and rules can be configured at initialization:

```js
const instance = init({
  embed: true,
  embedModels: { 'custom/clip-model': { dimensions: 768, loader: 'clip', dtype: 'fp32' } },
  embedRules: [
    { match: { good: true, multi: false }, use: 'mixedbread-ai/mxbai-embed-xsmall-v1' },
    { use: 'custom/clip-model' },
  ],
});
```

## Design principles

- **Fragments are purposeful**, not just substrings
- **States are vector bundles**, not single document embeddings
- **Properties are readouts**, not projections
- **Schemas are text-only** from `define` — vectors enter only at `ingest`
- **Raw text does not bypass the pipeline** — always fragment and ingest first
- **Provenance travels with fragments** — every fragment knows its source and derivation
- **Refinement is first-class**, not an afterthought
