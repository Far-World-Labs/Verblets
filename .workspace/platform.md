# Verblets Platform Design
> Shared utilities, cross-cutting patterns, competing approaches, design guidance.
> Reference from maturity/, blackboard.md, and chain-level analysis.

## Shared Infrastructure

### retry + chatGPT (the LLM call pattern)

**Canonical usage:**
```javascript
await retry(chatGPT, {
  label: 'descriptive-label',
  maxAttempts, onProgress, now, chainStartTime: now,
  chatGPTPrompt: prompt,
  chatGPTConfig: { llm, ...options },
  logger: options.logger,
});
```

**What retry does:** Retries on HTTP 429 by default. `retryOnAll: true` widens
to any error. Emits progress events internally. Accepts `retryDelay` (default
from `constants/common.js`).

**Gap:** `veiled-variants` calls `run` (chatGPT) directly without retry.
Some chains use retry but don't pass `logger` or `onProgress` through.

**Competing pattern:** `category-samples` uses a custom `retryCondition`
callback for selective retry. This is more flexible than the default 429-only
behavior. Worth considering whether this should be the standard approach.

---

### Shared config shape

**The convention:**
```javascript
const { llm, maxAttempts = 3, onProgress, now = new Date(), logger, ...options } = config;
```

**Purpose of each parameter:**
- `llm` — model selection (string alias or model object)
- `maxAttempts` — retry count, default 3 (mirrors `constants/common.maxRetries`)
- `onProgress` — event callback for progress/lifecycle events
- `now` — injectable clock for testability and orchestration timing
- `logger` — structured logging receiver

**Conformance:** 26 chains fully conformant. 12+ missing pieces.
See maturity/ "Shared Config Conformance" table for specifics.

**Decision needed:** Should chains import `maxRetries` from constants, or is
hardcoded `3` fine? Current state: `retry` lib imports the constant, but
all chains hardcode `= 3` locally. If the constant ever changes, chains
won't follow. Probably fine — chains own their defaults.

**Guidance:** New chains should destructure all 5 parameters. Existing chains
that already accept `config = {}` should add missing ones when touched.

---

### text-batch (token-budget-aware batching)

**What it does:** `createBatches(list, config)` splits arrays into batches
that fit within a model's context window. Uses `FALLBACK_TOKENS_PER_CHAR = 0.25`,
`MAX_ITEM_RATIO = 0.8`. Items exceeding `maxItemTokens` are marked `skip: true`.

**Used by:** map, filter, reduce, find, group (the 5 collection primitives).

**Key default:** `maxTokenBudget = 4000`. This is too low for many real-world
items (module source code at ~7000 chars gets skipped). Scripts and higher-order
compositions should set this explicitly.

**Competing pattern:** `sort` uses ramda's `R.splitEvery(chunkSize)` — fixed-count
batching, not token-aware. This works for sort's tournament algorithm where
items are short (just values being compared), but wouldn't work for variable-
length content. The two patterns serve different purposes.

**Competing pattern:** `glossary`, `collect-terms`, `timeline` do manual
chunking (sentence-based, word-count-based). These are content-aware splits
that can't be replaced by token-budget batching — they need semantic boundaries
(sentences, paragraphs) not token boundaries.

**Guidance:** Use `createBatches` when items are independent and you're fitting
them into an LLM context window. Use content-aware chunking when semantic
boundaries matter (text that needs to be read coherently).

---

### parallel-batch (concurrency control)

**What it does:** `parallelBatch(items, processor, {maxParallel})` processes
items in chunks of `maxParallel` using `Promise.all`. Default `maxParallel = 3`.

**Used by:** map, group, find, extract-blocks, timeline.

**Competing pattern:** `conversation` uses `p-limit` (third-party) instead.
`split` uses raw `Promise.all` with no concurrency limit.

**Tradeoff:** `parallelBatch` processes in fixed-size waves (process 3, wait,
process 3, wait). `p-limit` is a semaphore — starts next item as soon as any
slot frees. `p-limit` has better throughput when items have variable latency.
`parallelBatch` is simpler and sufficient when items take similar time.

**Decision needed:** Is `p-limit` worth keeping as a dependency for the
concurrency advantage, or should everything use `parallelBatch` for consistency?
Current guidance: use `parallelBatch` unless you have a measured throughput
problem with variable-latency items.

---

### progress-callback (lifecycle events)

**What it does:** Standardized event emission. Functions: `emitStart`,
`emitBatchStart`, `emitBatchComplete`, `emitBatchProcessed`, `emitStepProgress`,
`emitPhaseProgress`, `createBatchProgressCallback`, `createBatchContext`.

**Event shape:** `{ step, event, timestamp, progress, ... }`

**Used well by:** map, filter, reduce, find, group (full batch lifecycle),
sort (step progress), disambiguate, entities, socratic (step progress).

**Gap:** Many multi-step chains emit nothing: collect-terms, document-shrink,
anonymize (3-stage with no phase events), themes, summary-map, truncate,
conversation (multi-round with no events).

**Guidance:** Any chain that makes >1 LLM call should emit at least
`emitStart` and completion. Multi-phase chains should emit `emitPhaseProgress`.

---

### lifecycle-logger (structured logging)

**What it does:** `createLifecycleLogger(baseLogger, namespace)` wraps any
logger with `logStart`, `logResult`, `logEvent`, `logConstruction`,
`logProcessing`, `logError`, `child`. Also exports extraction helpers:
`extractLLMConfig`, `extractPromptAnalysis`, `extractBatchConfig`, `extractResultValue`.

**Used by:** map, socratic, date, central-tendency, extract-blocks, extract-features.

**Competing pattern:** filter, reduce, group, find do inline `logger?.info()`
with ad-hoc structured objects. This is simpler but inconsistent — each chain
invents its own log event shapes.

**Tradeoff:** lifecycle-logger adds a wrapper object and standardized event
names. More consistent, but more ceremony for simple chains. Inline logging
is fine for chains with 1-2 log points; lifecycle-logger pays off when a chain
has >3 log points or when you want to correlate events across a pipeline.

**Decision needed:** Should all core chains (map, filter, reduce, sort, group,
find) use lifecycle-logger, or is inline logging acceptable for the simpler ones?
Current state is mixed — map uses it, filter/reduce/group/find don't.

---

### lib/env (environment detection)

**What it does:** `env` proxy reads from `process.env` (Node) or
`window.verblets.env` (browser). `runtime.isBrowser`/`runtime.isNode` flags.

**Used by:** expect (and expect/index.browser.js).

**Gap:** `sort` and `timeline` use `process.env.VERBLETS_DEBUG` directly.
`test-analysis/*` uses `process.env` extensively (acceptable — Node-only subsystem).

**Guidance:** Production chains should use `env` from `lib/env` for any
environment reads, to maintain isomorphic compatibility.

---

### prompts/wrap-variable (asXML)

**What it does:** Wraps values in XML tags for LLM prompts.
`asXML(value, { tag: 'name' })` → `<name>value</name>`

**Used by:** 25+ chains. The dominant prompt structuring technique.

**Gap:** `collect-terms` and `document-shrink` use inline template strings
without XML wrapping for variables.

**Competing pattern:** Some chains use `promptConstants.onlyJSON` /
`onlyJSONStringArray` as prompt-level JSON enforcement. This is weaker than
`response_format` with a JSON schema — the prompt asks nicely, the schema
enforces structurally. Several chains could migrate from prompt-level JSON
instructions to `response_format` schemas.

**Guidance:** Use `asXML` for all variable injection in prompts. Use
`response_format` with JSON schemas instead of prompt-level JSON instructions
when structured output is required.

---

## Output Structuring

### response_format (JSON schemas) vs prompt-level instructions

**response_format approach:**
```javascript
chatGPTConfig: {
  modelOptions: {
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'result', schema: mySchema },
    },
  },
}
```
chatGPT module auto-unwraps `{value: X}` via `isSimpleValueSchema` and
`{items: [...]}` via `isSimpleCollectionSchema`.

**Prompt-level approach:** `onlyJSON`, `onlyJSONArray`, `onlyJSONStringArray`
constants appended to prompts.

**When to use which:**
- `response_format` — when you need guaranteed structure (scoring, entity
  extraction, any downstream parsing). Eliminates recovery code.
- Prompt-level — when output is free-form text that happens to be JSON-like,
  or when the model doesn't support structured output.

**Chains still using prompt-level that could use schemas:** list (uses
`onlyJSONArray`), to-object (uses `onlyJSON` + retry parsing). Worth
evaluating case by case — some may have good reasons.

---

## Prompt Management

Prompts are currently hardcoded in chain source files. `src/prompts/constants.js`
has 62 reusable fragments but only 23 are used. `src/prompts/` also has 18
helper modules that build prompt sections. Full inventory in
`maturity/prompt-engineering.md`.

### The state of things

Chains build prompts in three ways:
1. **Inline template literals** — most common. Prompt is a string in the function.
2. **Extracted prompt builder functions** — group, category-samples, dismantle
   extract builders that return prompt strings.
3. **Prompt constants** — `asJSON`, `explainAndSeparate`, `contentIsQuestion`
   etc. appended to prompts. Only the JSON/format and content-header constants
   see real use. The Reflective/Analytical/Evidence-Based sections (19 constants)
   are completely unused.

### What doesn't exist yet

- **Prompt versioning** — no way to A/B test or roll back a prompt change.
- **Prompt externalization** — prompts can't be edited without changing code.
  Steven has considered LaunchDarkly, Strapi, or a basic UI. At work: 100s of
  prompts in Google Sheets, 100s of context chunks in another sheet, but no
  fragment concept.
- **Prompt regression testing** — beyond example tests, no mechanism to detect
  when a prompt change degrades output quality.
- **Fragment composition** — the constants are flat strings. No mechanism to
  compose fragments conditionally (e.g., "if the chain needs strict output,
  append these fragments").

### Probably not one solution

Different prompt concerns need different approaches:
- Fragment reuse → improve constants.js organization, audit which chains
  would benefit from which fragments
- Externalization → depends on audience (developers only? or non-developers?)
- Versioning/testing → could be a composition concern (wrap prompt in a
  version-aware function)
- Temperature/penalty tuning → per-chain design decision, document in READMEs

See `maturity/prompt-engineering.md` for the full maturity dimension.

---

## Lifecycle Events

Analogous to domain events in DDD but at the infrastructure level. The
`progress-callback` lib provides the emission mechanism; chains decide
*what* to emit. There are standard events (all batch chains share them)
and bespoke events (domain-specific to a chain's purpose).

### Standard event vocabulary

From `lib/progress-callback`:

| Emitter | Event shape | Meaning |
|---------|-------------|---------|
| `emitStart` | `{event: 'start', step}` | Operation beginning |
| `emitComplete` | `{event: 'complete', step}` | Operation finished |
| `emitBatchStart` | `{event: 'start', totalItems, processedItems: 0}` | Batch operation beginning with item count |
| `emitBatchComplete` | `{event: 'complete', totalItems, processedItems: N}` | All batches finished |
| `emitBatchProcessed` | `{event: 'batch:complete', batchNumber, batchSize, totalItems, processedItems}` | One batch within a batch operation finished |
| `emitStepProgress` | `{event: 'step', stepName}` | Named step within a multi-step operation |
| `emitPhaseProgress` | `{event: 'phase', phase}` | Named phase within a multi-phase operation |

The `retry` lib also emits events through the same callback:
`{event: 'start'}`, `{event: 'retry', attemptNumber}`, `{event: 'error'}`,
`{event: 'complete'}`.

### How chains use these today

**Collection primitives** (map, filter, reduce, find):
Standard batch lifecycle — `batchStart` → per-batch `batchProcessed` → `batchComplete`.
These are the workhorses; their events are well-exercised.

**Group** — the most complete lifecycle:
`emitPhaseProgress('category-discovery')` → batch events → `emitPhaseProgress('assignment')` → batch events.
Two distinct phases with different semantics.

**Sort** — tournament-specific events:
`emitStart` → `emitStepProgress('sorting-chunk', {chunkIndex, totalChunks})` →
`emitStepProgress('extracting-extremes', {iteration})` → raw `onProgress({top, bottom, iteration, remaining})` → `emitComplete`.
Note: sort mixes standard emitters with a raw `onProgress` call (line 202-208)
that emits a completely custom shape. This is the only chain that does both.

**Disambiguate** — semantic step events:
`emitStepProgress('extracting-meanings')` → `emitStepProgress('scoring-meanings')`.
Clean, minimal, domain-meaningful.

**Score** — phase events via raw `onProgress`:
`onProgress({step: 'score', event: 'phase', phase: 'generating-specification'})` →
`onProgress({step: 'score', event: 'phase', phase: 'scoring-items', specification})`.
Note: emits manually instead of using `emitPhaseProgress`. Includes the generated
specification in the event — useful for debugging/inspection.

**Socratic** — domain-specific step logging:
Uses `emitStepProgress('asking-question')` and `emitStepProgress('answering-question')`
per round. Also logs via lifecycle-logger `chain:socratic:input` / `chain:socratic:output`.
Two parallel event streams (progress-callback + lifecycle-logger).

**Extract-blocks, extract-features** — chain-scoped logger events:
Use lifecycle-logger with `chain:extract-blocks:input` / `chain:extract-blocks:output`.
Not progress-callback events — these go through the `logger`, not `onProgress`.

**Test-analysis subsystem** — its own event vocabulary:
`test-suite-start`, `test-start`, `test-complete`, `expect`, `ai-expect`,
`suite-end`, `run-start`, `run-end`. Completely independent of
progress-callback. This is a domain-specific event system for test execution
observation, not batch processing progress.

### Competing patterns observed

**1. `emitPhaseProgress` vs raw `onProgress` for phases**
Group uses `emitPhaseProgress`. Score constructs the event object manually.
Same intent, different mechanism. The manual approach lets score include
the `specification` in the event, which `emitPhaseProgress` supports via
`metadata` but score doesn't use it that way.

**2. progress-callback vs lifecycle-logger**
progress-callback (`onProgress`): for consumers who want to observe progress
in real time (UIs, orchestrators). Shape: `{step, event, timestamp, ...}`.
lifecycle-logger (`logger`): for structured logging/debugging. Shape:
`logStart`, `logResult`, `logEvent` with namespaced events.
Some chains use both (socratic). Most use one or neither.
These serve different audiences but emit overlapping information.

**3. Standard batch events vs domain events**
The standard batch events (start/batch-processed/complete) are about
*throughput* — how many items have been processed. Domain events
(extracting-meanings, scoring-meanings, generating-specification) are about
*semantics* — what the chain is doing right now. Both are useful; they answer
different questions.

### What's missing — the "way of seeing this" we haven't found yet

The current event system is purely mechanical — "here's a function that emits
an event shape." There's no:

- **Event catalog** — no list of what events a chain emits. A consumer wiring
  up `onProgress` has to read source code to know what shapes to expect.
- **Event types** — no distinction between "this is a standard batch event
  every collection chain emits" vs "this is a domain-specific event unique
  to score." A consumer can't filter on "show me only phase transitions."
- **Contracts** — no way for a chain to declare "I emit these events." A chain's
  README doesn't list its lifecycle events. Tests don't assert on event sequences.
- **Composition awareness** — when score calls map internally, map's batch events
  flow through the same `onProgress`. A consumer sees interleaved events from
  different chains with no nesting/scoping.

**Possible directions (not decided):**

*Event type taxonomy.* Standard events get a `kind: 'batch'` or `kind: 'lifecycle'`
field. Domain events get `kind: 'domain'`. Consumers can filter by kind.

*Chain-scoped events.* When chain A calls chain B, B's events carry
`parent: 'A'` or similar nesting context. Consumers can reconstruct the
call tree.

*Declarative event manifest.* Each chain exports (or documents) what events
it emits. Analysis tools can verify this against actual emissions. READMEs
can generate a "Lifecycle Events" section automatically.

*"Interesting events" vs "plumbing events."* Not every emitBatchProcessed is
interesting to a consumer. Phase transitions and domain events often are.
Maybe the right default is: emit everything, but tag events with significance
level so consumers can filter.

None of these feel right yet. The test-analysis subsystem's approach — a
completely separate event vocabulary for its domain — might actually be the
most honest: different domains have different events, and forcing them into
one taxonomy loses information. But then you lose the ability to build
generic progress bars and dashboards.

---

## Composition Patterns

### Spec/Apply split

**Pattern:** `fooSpec(instructions, config)` → specification object.
`applyFoo(item, specification, config)` → result.

**Used by:** scale, score, entities, relations, tags, anonymize.

**What it enables:** Generate the spec once, apply it many times. The spec
captures intent; application is mechanical. Specs are introspectable —
callers can log, cache, or modify them.

**Known issue (§6):** `scaleSpec` sometimes generates specs with wrong input
domain assumptions. When asked to rate "documentation quality" of text, it
generates a rubric expecting numeric input. `applyScore` (direct) works fine;
the `mapInstructions` + `map` path fails. Spec pattern works best when input
domain is clear and narrow.

### Instruction builders

**Pattern:** `mapInstructions({ specification })`, `filterInstructions(...)`,
`reduceInstructions(...)`, `findInstructions(...)`, `groupInstructions(...)`.

**Used by:** Same chains as spec/apply (scale, score, entities, relations,
tags, anonymize).

**What they return:** Prompt strings designed to be passed directly to the
5 collection primitives. This lets you do `filter(items, filterInstructions({specification, processing}))`.

**Naming convention:** All use `{ specification, processing }` parameters.
4 READMEs originally had chain-specific names (fixed in publishability pass).

### Factory functions

**Pattern:** `createFoo(instructions, config)` → closure with `.specification`.

**Used by:** scale (`createScale`), entities (`createEntityExtractor`),
relations (`createRelationExtractor`), tags (`createTagExtractor`),
anonymize (`createAnonymizer`).

**What it enables:** Pre-configure a chain with a spec, then call it
repeatedly. The closure carries the specification. `.specification` property
makes it introspectable.

---

## Documentation Architecture

### The shared-config-in-every-README problem

26+ chains accept `llm`, `maxAttempts`, `onProgress`, `now`, `logger`.
Each README either documents these individually, documents a subset, or
doesn't mention them.

**Current approach:** `src/chains/README.md` has a "Shared Configuration"
section. Individual READMEs should link to it.

**Options worth considering:**
- Every README says "See [shared configuration](../README.md#shared-configuration)"
  and only documents unique parameters
- A generated "shared concerns" section injected into each README by a script
- Accept some duplication; each README is self-contained

**Leaning toward:** "Link to shared, document unique" — less duplication,
one source of truth, but individual READMEs become less self-contained.

### Non-linear documentation

Steven's observation: "documentation should be non-linear when there are
optional shared concerns that show up everywhere."

Logging, progress events, retry behavior, token budgets — these are cross-cutting
concerns. Currently documented linearly (each chain repeats or omits).
A non-linear approach might look like:
- Shared concerns page (how logging works across all chains)
- Per-chain pages reference the shared page for applicable concerns
- Something like "this chain supports: logging (§1a level 2), progress (§1b level 3)"

---

## Composition & Decomposition Guidance

This is the area Steven flagged (Q1): "what notes/blackboard/design doc are
we tracking to explore this general verblets decomposition problem?" There's
no top-level guidance yet on how to think about composing verblets. What
follows is what we observe; the guidance is still forming.

### What composition looks like today

**Chains that compose other chains:**
- `score` uses `map` internally (with `mapInstructions`)
- `anonymize` uses `map` for batch application after spec generation
- `scale` uses `map` for batch application
- `entities`, `relations`, `tags` follow the same spec→map pattern
- `group` calls LLM twice in sequence (category discovery → assignment)
- `socratic` runs a multi-round Q&A loop

**Chains that are composed by scripts/consumers:**
- The profiler script: `map` → `score` → `group` → `sort` → `reduce`
- The simplifier script: `map` → `reduce`
- Both use instruction builders to wire one chain's output into the next

### Three composition mechanisms

1. **Spec/Apply** — Generate a specification once, apply it to many items
   via map. The spec captures intent; application is mechanical. Good when
   the "what" is complex but the "how" is uniform.

2. **Instruction builders** — `mapInstructions`, `filterInstructions`, etc.
   Transform a specification into a prompt suitable for a collection primitive.
   Good when you want a spec-generating chain to compose with a batch chain.

3. **Pipeline composition** — Chain outputs feed into chain inputs in a
   script. No formal mechanism; it's just JavaScript. The profiler script
   is our best example. Good when each stage is independent and you want
   human-visible intermediate results.

### What's missing

- **No formal pipeline abstraction** — Each script manually wires stages.
  Steven's observation: this is fine early (Transaction Script) but will
  get complex (PoEAA progression). We're watching for when the complexity
  warrants something more structured.

- **No composition of events** — When score calls map internally, map's
  batch events flow through the same `onProgress` with no scoping. See
  Lifecycle Events section.

- **No composition of errors** — When a chain-of-chains fails, the error
  context is from the innermost chain. No wrapping, no "score failed
  because map failed on items 3,7,12."

- **No guidance for consumers** — A developer wanting to compose verblets
  has no documentation on which patterns to use when. The three mechanisms
  above are observable from code but not documented anywhere external.
