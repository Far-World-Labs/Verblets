# Automation

## Pragma

- **include:** execution model, RunContext shape, ctx.lib split, storage domains and API, observability, run history, termination
- **exclude:** per-automation behavior (belongs with the automation), prompt assembly, caching mechanics
- **gray:** media encoding — detailed only when viewer integration is specified

---

## Definition

An automation is a durable, rerunnable artifact that orchestrates verblets library capabilities against a target domain. Automations declare inputs, manage state across runs, emit rich activity, and produce structured output. They are not one-off scripts.

Every automation exports `{ meta, run }`:
- `meta` — `{ name, description, version }`
- `run` — `async (ctx, params) => result`

## Execution Model

An automation receives a RunContext (`ctx`) and invocation parameters (`params`). It owns its lifecycle: discovery, execution, analysis, persistence. The automation system discovers and invokes automations; it does not own their internal logic.

Invocation parameters are execution inputs from the command line, page/UI, or parent automation. They appear in `params`, not in persistent storage.

### Fresh-Data Default

Fresh-data execution is the default posture. Automations execute against live data and live runtime behavior. Caching is explicit, visible, and opt-in (`params.cache = true`). Cached results must be distinguishable from fresh results.

---

## RunContext Shape

```
ctx.lib                        — shared local runtime surface
  ctx.lib.verblets             — isomorphic verblets library (shared.js)
  ctx.lib.scripts              — Node.js-dependent utilities
    ctx.lib.scripts.files      — path-based file operations
    ctx.lib.scripts.exec       — automation-to-automation execution
    ctx.lib.scripts.mediaEncoding — content-negotiation metadata
    ctx.lib.scripts.webScrape  — web scraping chain
    ctx.lib.scripts.siteCrawl  — site crawling chain
    ctx.lib.scripts.tileImages, imageToBase64, resizeImage — image utilities
    ctx.lib.scripts.createTempDir, resolveOutputDir — temp file management
    ctx.lib.scripts.process    — explicit termination
  ctx.lib.emit                 — plain progress emitter (top-level for convenience)

ctx.localStorage               — invocation-local and run-local storage
ctx.automationStorage          — persistent per-automation across runs
ctx.domainStorage              — persistent domain/repo-level artifacts
```

### Split Criteria

- **verblets** — useful in automations AND browser UI. No Node.js APIs. Everything from `shared.js`.
- **scripts** — useful in automations but requires Node.js (fs, process, browser automation). Not for browser/UI.
- **Exclude** — the harness itself (automation-runner, RunContext constructor) is not exposed to automations.

---

## Storage Domains

Three storage domains, each with different scope and lifetime:

| Domain | Scope | Lifetime | Purpose |
|--------|-------|----------|---------|
| `ctx.localStorage` | invocation / run | current run | params, ENV, self, transient values |
| `ctx.automationStorage` | one automation | persistent | run history, scoring specs, durable caches |
| `ctx.domainStorage` | domain / repo | persistent | shared reference artifacts, domain-wide outputs |

These are storage domains, not storage backings. Whether the backing is filesystem, KV store, or structured directory is an implementation detail.

### Storage API

All domains use the same interface: `get(key)`, `set(key, value)`, `has(key)`, `delete(key)`, `list(prefix?)`, `getJSON(key)`, `setJSON(key, value)`.

Keys are opaque strings. `/` is the hierarchical delimiter when structure is needed. Do not assume dots are safe separators (file names contain dots).

Storage is not fluent. Storage is not a reference-builder. Storage does not hold live runtime objects. "Reference" means an ordinary in-process JavaScript object reference, not a custom identifier/ref protocol.

### Reserved localStorage Keys

- `ENV` — environment variables relevant to the invocation
- `self` — self-descriptive automation context: `{ name, params, startedAt }`

---

## Invariants

- Storage is boring: get/set/has/delete/list with opaque keys. Not fluent, not a reference-builder.
- Live runtime objects (emitters, channels) exist in `ctx.lib`, never in storage.
- `ctx.lib.scripts.files` uses real path strings. Explicitly Node.js-like.
- Invocation parameters come from `params`, not from persistent storage.
- `ctx.lib.verblets` is the full isomorphic library surface (`shared.js`), not a curated subset.

---

## Observability

Observability is a first-class runtime surface. Run-time activity is reusable during the run, not only after.

`ctx.lib.emit` is the central pathway for emitting progress, activity, events, and metrics. It also supports local processing of recent events by the automation itself, tooling updates, and fast query over recent activity.

The emission model follows verblets eventing conventions. Logging is emit-with-message and optional level, integrated with the same event stream.

Automations that need activity query (ring buffer, stats, filtering) create their own using `ctx.lib.verblets.ringBuffer` — a documented pattern, not built-in infrastructure.

---

## Run History

Run history is selective and high-value. Store in `ctx.automationStorage`:
- Top-level files used by the run
- Important prompts or prompt references
- Important context references
- High-level metrics (LLM call count, average latency, module count, scores)
- References to important output artifacts

Avoid storing: low-value intermediates, bulky transient working data, redundant event dumps. The current run is the 0th item of the run-history array, populated selectively as the run proceeds.

---

## Media Encoding Metadata

A sibling API to storage associates content-negotiation metadata with stored artifacts — how viewers and local tooling should present the artifact. Multiple encodings can coexist per artifact. The stable contract covers purpose and semantics; implementation details cover current shape, supported types, and viewer-selection logic.

---

## Termination

`ctx.lib.scripts.process.exit()` provides explicit termination aligned with the runner. Use it when the automation has completed its intended work and all post-processing steps have caught up. Do not depend on implicit process exit timing.

---

## Composition

`ctx.lib.scripts.exec.automation(name, params)` is the main composition mechanism. It resolves the automation from the registry, constructs a child RunContext with shared projectRoot and onProgress, and returns the automation's result.

---

## ctx.lib.scripts.files

Path-based file operations: `read`, `write`, `exists`, `stat`, `mkdir`, `readdir`, `glob`, `remove`, `copy`, `move`. Paths are real absolute paths or resolved relative to a configured root directory.

---

## ctx.lib.verblets

The full isomorphic verblets library. Chains, verblets, LLM, context, progress, utilities, pure functions, constants. These are the actual exports from `shared.js`, not wrappers.

---

## References

- Event model and vocabulary: `src/lib/progress/constants.js`, `.claude/docs/progress-tracking.md`
- Event vocabulary normalization: `.claude/adr/2026-03-30-event-vocabulary-normalization.md`
- Option resolution: `.claude/docs/option-resolution.md`, `src/lib/context/option.js`
- Chain design: `src/chains/DESIGN.md`
- Verblet design: `src/verblets/DESIGN.md`
- Configuration philosophy: `.claude/reference/configuration-philosophy.md`
