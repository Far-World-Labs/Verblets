# Changelog

## 0.8.0 (2026-04-30)

### Added

- **score-matrix chain**: evaluate a list of items against a multi-dimensional rubric in one operation. Returns a matrix of scored rationales aligned with the rubric. Anchoring policy (`low`/`med`/`high`) controls how strict the cross-row calibration is.
- **Three-form list/item API across every list-iterating chain.** Each chain that takes either a single item or a list now exposes all three shapes from the same module:
  - **per-item function** (`xxxItem`) — single LLM call, ready to drop into your own `pMap`/`pReduce`/streaming.
  - **parallel-managed orchestrator** (`mapXxxParallel`) — one LLM call per item with bounded concurrency.
  - **batched-LLM orchestrator** (`mapXxx`) — many items packed into one prompt.
  Coverage: `map`, `filter`, `find`, `reduce` (no parallel — sequential by definition), `group`, `scale`, `score`, `tags`, `calibrate`, `entities`, `relations`, `pop-reference`, `people`. Per-item entries on `filter` and `find` are re-exports of `verblets/bool`.
- **`expect-shape` library**: small set of boundary validators (`expectArray`, `expectObject`, `expectString`, `expectNumber`) that surface malformed LLM responses with chain-tagged errors. Integrated across 11 chains so contract violations stop at the chain boundary instead of propagating undefined values into downstream math/strings.
- **Retry mode presets** (`strict`, `patient`, `persistent`) on `lib/retry/presets.js`. Tunes rate-limit ceiling, credit-exhaustion interval, and overload backoff per mode. Error classification (`lib/retry/error-classification.js`) routes 429s, 5xxs, and credit/overload responses to the right handler with explicit, traced retry events.
- **Option resolution as a top-level module** (`lib/option/index.js`): `nameStep`, `getOption`, `getOptions`, `withPolicy` are now in one place rather than embedded in `lib/context/option.js`. Decision traces flow through the standard telemetry channel.
- **Response-format helpers** (`lib/response-format/index.js`): the `jsonSchema(name, schema)` builder plus shape detectors (`isSimpleCollectionSchema`, `isSimpleValueSchema`) used by `callLlm` to auto-unwrap `{ value }` and `{ items: [...] }` envelopes.
- **Spec coverage** for `lib/context`, `lib/llm`, `lib/parallel-batch`, and most prompt builders. Adds ~14k lines across 30+ new spec files.
- **CI Node-matrix fix** (`.github/workflows/ci.yml`): only runs the test matrix against Node versions that have actually entered LTS. The previous filter picked up future LTS lines as soon as they appeared in the schedule, several days before `actions/setup-node` could resolve them — every PR check broke when v26 entered the schedule on 2026-04-22. Tightened to require an LTS date in the past.

### Changed (breaking)

- **Naming normalized for `calibrate`, `entities`, `relations`, `people`, `pop-reference`** to match the `xxxItem` / `mapXxx` / `mapXxxParallel` convention used by `score`, `tags`, `scale`:
  - `extractEntities` → `entityItem`
  - `extractRelations` → `relationItem`
  - `peopleList` (default) → `peopleSet`
  - `popReference` (default) → `popReferenceItem`
  - `calibrate` (per-item default) → `calibrateItem`
- **`mapXxxBatched` aliases removed** — the unsuffixed name is the batched-LLM list form everywhere now (matching `mapScore`, `mapTags`, `mapScale`). The old parallel-managed defaults that previously held the unsuffixed name moved to `mapXxxParallel`:
  - `mapCalibrateBatched` → `mapCalibrate`; old `mapCalibrate` → `mapCalibrateParallel`
  - `mapEntitiesBatched` → `mapEntities`; old `mapEntities` → `mapEntitiesParallel`
  - `mapRelationsBatched` → `mapRelations`; old `mapRelations` → `mapRelationsParallel`

### Fixed

- **Map batch overflow corruption**: under-/oversized LLM responses no longer silently corrupt slot alignment in batched maps.
- **JSON/XML output format conflict** in batch prompts when a custom `responseFormat` was supplied alongside auto-style guidance.
- **Hardened filter** boundary validation on per-batch decision arrays.
- **Threaded `init`-time LLM config through every chain** so model overrides set at init no longer get dropped by sub-chains.
- **`map` total failure** is now surfaced as a chain-level error instead of silently returning an array of `undefined`.

## 0.7.0 (2026-04-26)

### Added

- **`sem.*` semantic state system**: negotiated multimodal embedding pipeline, semantic-state primitives, and the `embed-object-define` / `embed-object-fragment` / `embed-object-refine` chains.
- **Instruction-as-context**: structured prompt composition via `resolveTexts` / `resolveArgs` that lets bundles carry `text` plus chain-specific known keys (e.g. `spec`, `vocabulary`, `categories`) through any collection chain unchanged.
- **Automation system**: `RunContext` execution model with `ctx.lib` split, observability hooks, run history, and rule-based model negotiation. Driven by ADRs and specs under `.claude/spec/automation*.md`.
- **Instance-based `init()`**: each call returns an isolated `ModelService` so two consumers in the same process don't clobber each other's model rules.

### Changed

- README restructured around the embedding surface; `.gitignore` hardened against credential leakage.
- Repo-root cleanup: docs moved to `.claude/`, spec/ADR/guidelines reorganized.

## 0.6.3 (2026-04-01)

### Fixed

- All 78 modules now score Excellent (2.5+) on eventing quality assessment (up from 73).
- Full emitter lifecycle (start, complete with outcome, error) across all chains and verblets.
- Trace context propagation: `runConfig` passed to `callLlm`, `retry`, and sub-chains consistently.
- Event vocabulary compliance: replaced ad-hoc string literals with `DomainEvent.step`/`DomainEvent.phase` constants.
- Batch progress tracking via `emitter.batch()` for all list-processing chains.
- `scopePhase` delegation for all multi-stage chains.
- `withPolicy` option mappers added to conversation (depth, maxParallel), ai-arch-expect (bulkSize, maxConcurrency), set-interval (tolerance).
- set-interval: graceful self-termination after consecutive errors instead of infinite fallback loop.
- dismantle: trace context now flows through `callLlm` in decompose/enhance operations.

## 0.6.0 (2026-03-28)

### Breaking Changes

- **Three-kind event taxonomy**: Progress events now have three `kind` values (`event`, `operation`, `telemetry`) instead of two. Domain moments go through `emit()`, execution progress through `progress()`, infrastructure metrics through `metrics()`.
- **OTel-aligned property names**: `tokens.input`/`tokens.output` renamed to `usage.inputTokens`/`usage.outputTokens`. `duration` renamed to `durationMs`. `error.httpStatus` renamed to `error.httpStatusCode`.
- **All enumerated values are now constants**: Import from `lib/progress/constants.js` (`Kind`, `StatusCode`, `ChainEvent`, `OpEvent`, `DomainEvent`, `TelemetryEvent`, `LlmStatus`, `ModelSource`, `OptionSource`).

### Added

- OTel trace context: `traceId` (32 hex chars), `spanId` (16 hex chars), `parentSpanId` generated in `nameStep()` and propagated through config to every event.
- Resource identity: `libraryName` and `libraryVersion` on all progress events.
- `statusCode` (`ok`/`error`) on chain lifecycle events (`complete`, `error`).
- `error.type` from constructor name on error events.
- `provider` field on LLM telemetry events.
- Central constants module (`lib/progress/constants.js`) with frozen objects for all event enumerations.

## 0.5.0 (2026-03-25)

### Added

- Operation paths: hierarchical `operation` field on all progress events, composed via `nameStep()`.
- `createProgressEmitter` with `start()`, `complete()`, `error()`, `batch()` lifecycle methods.
- `scopePhase()` for composable phase scoping on progress callbacks.

### Changed

- Refactored all chains to use `createProgressEmitter` for consistent lifecycle events.
- Externalized `@huggingface/transformers` from bundle, gated behind `init()`.

### Fixed

- Browser bundle: replaced deleted `scopeOperation` with `nameStep`.

## 0.4.0 (2026-03-21)

### Added

- Config interface redesign: `nameStep()` for operation path composition, policy channel for option resolution, `getOption()`/`getOptionDetail()` with decision traces.
- Prompt-piece reshape advisor with suggestion model.
- Sensitivity pipeline with Qwen privacy model support.
- RAG toolkit: query transforms, text normalization, context expansion, privacy probes.
- `.for()` per-item factories on collection chains.
- Chain DX: barrel export, batch tracker, simplified retry.
- Multi-provider LLM support (OpenAI, Anthropic, OpenWebUI).

### Changed

- Centralized debug logging, fixed isomorphic concerns.
- Removed ramda dependency, replaced with native JS.

### Fixed

- Silent config drops across chain boundaries.
- SummaryMap.get() always returning null.
- Logger forwarding in reduce, filter, and find batch chains.

## 0.3.1 (2025-09-02)

### Fixed

- Removed vitest from production dependencies.

## 0.3.0 (2025-08-31)

### Added

- Entity recognition chain.
- Timeline extraction chain.
- Relations and triple-style relationship primitives.
- Isomorphic package support (browser + Node).
- Scale verblet and collection API for score.
- Detect-patterns chain.
- Truncate chain with semantic boundary detection.
- Split chain, join chain.
- Architecture test harness and AI test suite.
- Pop culture reference generator.
- Conversation chain bulk features.

### Changed

- Renamed bulk operations to chain naming convention.
- Introduced `asXML` wrapper for structured prompts.
- Batched anonymize processing.

## 0.2.0 (2025-06-22)

### Added

- Conversation chain with bulk features.
- Ring buffer simplification.

### Fixed

- Fake timers in llm-logger tests.

## 0.1.7 (2025-06-17)

Release tooling fixes.

## 0.1.6 (2025-06-17)

Release tooling fixes.

## 0.1.5 (2025-06-17)

### Added

- Structured ChatGPT outputs with JSON schema.
- LLM config passthrough.
- Model negotiation (multiple model types).
- Privacy model support and veiled variants.
- Chains: disambiguate, Socratic, glossary, entities, themes, bulk-filter, bulk-find, list-group-by, adaptive setInterval.
- Verblets: name, nameSimilarTo, intersection, llm-expect, bool.
- OpenWebUI model support.
- Top-level namespace exports.

### Changed

- Renamed category seed generator to samples.
- Renamed adaptiveInterval to setInterval.
- Switched scripts to commander.

## 0.1.0 (2023-04-27)

Initial release. Core verblets: summary-map, list-expand, list-reduce, score, shorten-text, to-object. ChatGPT API integration. Basic BFS repo scanning.
