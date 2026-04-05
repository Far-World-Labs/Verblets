# Automation System

## Definition

An automation is a durable, rerunnable artifact that orchestrates verblets library capabilities against a target domain. Automations are not one-off scripts. They declare their inputs, manage state across runs, emit rich activity, and produce structured output.

Every automation exports `{ meta, run }`:
- `meta` — `{ name, description, version }` describing identity and purpose
- `run` — `async (ctx, params) => result` where `ctx` is a RunContext instance and `params` are invocation parameters

## Execution Model

An automation receives a RunContext (`ctx`) and invocation parameters (`params`). It owns its lifecycle: discovery, execution, analysis, persistence. The automation system discovers and invokes automations; it does not own their internal logic.

Invocation parameters are execution inputs. They come from the command line, page/UI, or parent automation. They appear in `params`, not in persistent storage. `ctx.localStorage` stores `self` (automation identity + params) and `ENV` (relevant environment variables) for introspection, but the canonical source of invocation parameters is the `params` argument.

## Fresh-Data Default

The local automation system treats fresh-data execution as the default posture. Automations prefer to execute against live data and live runtime behavior rather than cached results.

Caching is explicit, visible, and deliberately configured. When an automation supports caching, it must be opt-in (e.g., `params.cache = true`), not the default. Cached results must be clearly distinguishable from fresh results in outputs and run history.

## Three Conceptual Layers

### 1. Automation system (this spec)
The durable architecture of how automations run, receive context, invoke child automations, emit progress, persist state, and terminate.

### 2. Automation spec (per-automation)
The durable purpose and structure of a specific automation: what it evaluates, what artifacts it produces, how it composes, what persists across runs.

### 3. Implementation details
Anything likely to change: file locations, transport choices, caching mechanics, prompt assembly, child process mechanics, storage backings, compatibility shims.

Timeless specs are `<name>.md`. Changeable implementation details are `<name>.impl.md`. Do not mix them.

## Storage Domains

Three storage domains, each with different scope and lifetime:

| Domain | Scope | Lifetime | Purpose |
|--------|-------|----------|---------|
| `ctx.localStorage` | invocation / run | current run | params, ENV, self, transient local values, run-local persisted values |
| `ctx.automationStorage` | one automation | persistent | run history, scoring specs, durable caches, stable artifacts |
| `ctx.domainStorage` | domain / repo | persistent | shared reference artifacts, domain-wide reports, published outputs |

These are storage domains, not storage backings. Whether the backing is filesystem, KV store, or structured directory is an implementation detail.

### Storage API

All domains use the same boring interface: `get(key)`, `set(key, value)`, `has(key)`, `delete(key)`, `list(prefix?)`, `getJSON(key)`, `setJSON(key, value)`.

Keys are opaque strings. `/` is the hierarchical delimiter when structure is needed. Do not assume dots are safe separators (file names contain dots). Raw opaque keys are always valid.

Storage is not fluent. Storage is not a reference-builder. Storage does not hold live runtime objects. "Reference" means an ordinary in-process JavaScript object reference, not a custom identifier/ref protocol.

## Observability

Observability is a first-class runtime surface. Run-time activity is reusable during the run, not only after.

`ctx.lib.emit` is the central pathway for:
- Emitting progress, activity, events, and metrics
- Local processing of recent events by the automation itself
- Tooling updates (progress views, summaries, logs)
- Fast query and decisioning over recent activity

The emission model follows verblets eventing conventions. Logging is emit-with-message and optional level, integrated with the same event stream.

## Run History

Run history is selective and high-value. Store in `ctx.automationStorage`:
- Top-level files used by the run (including the automation script)
- Important prompts or prompt references
- Important context references
- High-level metrics (LLM call count, average latency, module count, scores)
- References to important output artifacts
- References to meaningful tables, matrices, reports, and viewer-ready files

Avoid storing: low-value intermediates, bulky transient working data, redundant event dumps, anything that belongs in local temp capture.

The current run is the 0th item of the run-history array. It starts mostly empty and is populated selectively as the run proceeds.

## Media Encoding Metadata

A sibling API to storage associates content-negotiation metadata with stored artifacts. This metadata describes how viewers and local tooling should present the artifact:

```javascript
{ type: 'table', sortRowsBy: 'sync:matrix' }
{ type: 'matrix', projection: 'object-property', rowLabel: 'object:name', default: true, sortRowsBy: ['date', ...] }
```

Multiple encodings can coexist per artifact. The stable contract covers purpose and semantics. Implementation specs cover current shape, supported types, defaults, and viewer-selection logic.

## Termination

`ctx.lib.process.exit()` provides explicit termination aligned with the runner. Use it when the automation has completed its intended work and all post-processing and persistence steps have caught up. Do not depend on implicit process exit timing.

## References

- Event model and vocabulary: `src/lib/progress/constants.js`, `docs/progress-tracking.md`
- Event vocabulary normalization: `docs/adr/2026-03-30-event-vocabulary-normalization.md`
- Option resolution: `docs/option-resolution.md`, `src/lib/context/option.js`
- Chain design: `src/chains/DESIGN.md`
- Verblet design: `src/verblets/DESIGN.md`
- Permanent flags: `.claude/spec/permanent-flags.md`
- Context design: `.claude/spec/context-design.md`
