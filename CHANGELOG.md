# Changelog

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
