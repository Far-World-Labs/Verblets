# Event Vocabulary Normalization

The progress event system accumulated four competing naming styles across 54 chains. This ADR records the noun audit findings and the normalization decisions applied.

## Context

Content-event work (emitter.content, chain:input/output, isOperationalError annotations) revealed that while the structural plumbing was sound — four channels (event, operation, telemetry, content), lifecycle boundaries, batch progress — the naming layer was inconsistent. The same abstract concept had different names depending on which chain introduced it.

A code audit across all chains, libs, and verblets identified five families of naming inconsistency:

1. **Content segmentation nouns** — `chunk` had 4 incompatible object shapes; `fragment` duplicated `item`; two near-identical `createChunks` functions existed.
2. **Spec/instruction parameter naming** — three spec generators called user input `prompt`, one called it `instructions`, colliding with the assembled LLM prompt variable.
3. **Decision lifecycle nouns** — `choices` in one chain where every other chain used `candidates`.
4. **Attempt counting** — `attempt`, `attemptNumber`, and `retryCount` for the same field.
5. **Error recovery vocabulary** — `fallback` overloaded as boolean, stepName, and reason string; batch-retry logic duplicated between map and score; no chain-level outcome signal.

Additionally, 18 chains had clear multi-stage structure but only emitted `DomainEvent.step`, not phases.

## Decisions

### Segmentation nouns: 4 distinct, 1 collapsed, 1 absent

| Noun | Meaning | Status |
|------|---------|--------|
| **chunk** | Mechanically-sized piece of text for LLM processing | Keep. Unified shape via `lib/create-chunks`. |
| **block** | Semantically-identified region (LLM-detected line ranges) | Keep. Only in extract-blocks. |
| **window** | Overlapping view with source indices | Keep. In window-for, join, extract-blocks. |
| **item** | Generic list element | Keep. Not a segmentation noun. |
| **fragment** | Element of a list being joined | **Collapsed into item.** Only existed in join/window-for, meant the same thing. |
| **segment** | — | Never existed in codebase. Do not introduce. |

**Chunk shape standardization**: `truncate/createChunks` and `document-shrink/createChunks` were near-duplicate functions returning `{ text, endIndex }` and `{ text, index, start, size }` respectively. Extracted to `lib/create-chunks` with unified shape `{ text, index, start, size, endIndex }`.

Rejected alternative: introducing a `segment` noun to unify chunk and block. The mechanical/semantic distinction is real and worth preserving.

### Spec/instruction/schema: three distinct concepts, one parameter rename

The lifecycle is: `instructions` (user input) → `xxxSpec()` → `specification` (LLM-generated) → `xxxInstructions()` → composed prompt.

These are not synonyms. They are pipeline stages. The only fix needed: rename the `prompt` parameter in `scaleSpec`, `entitySpec`, and `relationSpec` to `instructions`, matching `tagSpec` and all chain-level APIs. The word `prompt` is reserved for assembled LLM prompt strings.

`schema` always means JSON Schema for `response_format`. No ambiguity in kind, only in role (spec-shaping vs result-shaping). No change needed.

Rejected alternative: a type alias for "composed instructions." The `xxxInstructions` function names are clear enough; adding a type would be over-engineering.

### Decision lifecycle: surprisingly consistent, one rename

Three lifecycle shapes exist across chains:
- **Evaluate-and-pick** (single winner): find, disambiguate, value-arbitrate
- **Score-and-rank** (ordered set): score, sort, filter, collect-terms
- **Decide-per-item** (categorical): filter, site-crawl

The nouns `candidate`, `selected`, `decision`, and `option` are already consistent. The one fix: rename `choices` to `candidates` in the questions chain (the telemetry field was already `candidateCount`).

The stepName suffixes `-selected` and `-resolved` are an intentional distinction:
- `-selected` = chain picked items from a pool
- `-resolved` = chain computed/determined a value

Rejected alternative: forcing all three lifecycle shapes into one unified vocabulary. The shapes are genuinely different.

### Attempt counting: one canonical field name

`attemptNumber` is the canonical field, established by `lib/retry`. Changed `attempt` (to-object) and `retryCount` (map, score) to `attemptNumber`.

### Error recovery: unified outcome vocabulary

11 recovery patterns exist across the codebase. They share a common state machine:

```
attempt → success (resolve)
        → transient error → retry (same strategy)
        → structural error → escalate (different strategy)
        → unrecoverable → fallback (degraded result)
                        → skip (undefined, continue pipeline)
                        → exhaust (terminal failure)
        → partial success → recover (post-hoc repair)
```

The canonical outcome values are: `success`, `degraded`, `partial`, `failed`.

**Chain-level outcome**: `emitter.complete()` now carries an `outcome` field so consumers can determine chain health without scanning the event stream for `isOperationalError` events.

**Batch-retry extraction**: the identical for-loop in map and score (collect undefined results, re-run failures, merge back) extracted to `lib/retry-undefined`.

Rejected alternative: a single `RecoveryStateMachine` class. The 11 patterns are similar but not identical — forcing them into one abstraction would require more escape hatches than it saves.

### What this ADR does NOT change

These are recorded as future directions, not current decisions:

1. **Promoting object/action/stage/outcome to first-class event fields.** The current `DomainEvent.step` + `stepName` pattern works. Decomposing step names into structured fields (e.g., `{ object: 'batch', action: 'process', stage: 'error', outcome: 'fallback' }` instead of `stepName: 'batch-error'`) is valuable for aggregation but touches every chain. Deferred until the event model is revised holistically.

2. **Replacing raw custom event names in site-crawl/web-scrape.** Events like `page:start`, `url:error`, `gate:start` are domain-specific to the browser chains. They work and are internally consistent. Migrating them to the `DomainEvent.step` pattern would improve cross-chain filtering but break existing consumers.

3. **Adding DomainEvent.phase to the 18 implicit-phase chains.** The audit identified score, tags, tag-vocabulary, filter-ambiguous, join, and site-crawl as high-priority candidates. This is a separate body of work with its own testing implications.

4. **Stable contentType names for durable content.** Seven content tags (`spec`, `meanings`, `categories`, `query-expansions`, `anchors`, `llm:system`, `llm:schema`) are cacheable across invocations. Giving them well-known `contentType` names enables future caching but requires a content-type registry design.

5. **A `category` field distinguishing lifecycle/operational/domain/policy events.** Currently implicit in event names and properties. Making it explicit enables better filtering but requires touching all emitter.emit() call sites.

## Audit artifacts

The full code audit is in `/tmp/`:
- `verblets-event-catalog.txt` — 993-line catalog of every event emission point
- `audit-segmentation-nouns.txt` — chunk/block/window/fragment analysis
- `audit-spec-nouns.txt` — spec/schema/instruction lifecycle
- `audit-decision-nouns.txt` — candidate/decision/selection lifecycles
- `audit-error-recovery.txt` — 11 recovery patterns with state transitions
- `audit-phases-and-content.txt` — implicit phases and content durability
- `verblets-noun-audit-synthesis.txt` — consolidated findings
