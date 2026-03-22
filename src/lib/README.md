# Library Utilities

Low-level utilities that support [chains](../chains/) and [verblets](../verblets/). Library modules have no dependencies on higher tiers and provide single-responsibility functions.

## Core

- [llm](./llm) — LLM API wrapper with capability-based model selection, structured output, and automatic JSON parsing
- [context](./context) — Config resolution: `getOption`, `getOptions`, `withPolicy`, `scopeOperation`, `initChain`
- [retry](./retry) — Config-aware async retry with configurable attempts and delay
- [parallel-batch](./parallel-batch) — Parallel execution with concurrency limits

## Text Processing

- [chunk-sentences](./chunk-sentences) — Split text at sentence boundaries
- [shorten-text](./shorten-text) — Compress text using LLM summarization
- [strip-response](./strip-response) — Clean up model response formatting
- [strip-numeric](./strip-numeric) — Remove non-digit characters
- [parse-llm-list](./parse-llm-list) — Parse JSON arrays or CSV from LLM responses

## LLM Output Parsers

Convert raw LLM text responses into typed values. These are the internal implementations behind the primitive verblets.

- [to-bool](./to-bool) — Parse text into a boolean
- [to-enum](./to-enum) — Parse text into one of several options
- [to-number](./to-number) — Parse text into a number
- [to-number-with-units](./to-number-with-units) — Parse numbers with units
- [to-date](./to-date) — Parse text into a date
- [extract-json](./extract-json) — Extract JSON from mixed text/markdown responses

## Embedding & Search

- [embed](./embed) — Embedding primitives: `embed`, `embedBatch`, `embedChunked`, `embedWarmup`
- [embed-score](./embed-score) — Score and rank items against a query using cosine similarity
- [embed-normalize-text](./embed-normalize-text) — Normalize text (NFC, whitespace, line endings) for consistent embedding
- [embed-neighbor-chunks](./embed-neighbor-chunks) — Expand retrieved chunks with neighboring context

## Data Structures

- [ring-buffer](./ring-buffer) — Single-writer, multiple-reader async ring buffer with backpressure
- [combinations](./combinations) — Generate array combinations and range combinations
- [pipe](./pipe) — Function composition pipeline
- [pure](./pure) — Functional utilities: `chunk`, `compact`, `cosineSimilarity`, `last`, `omit`, `pick`, `sortBy`, `unionBy`, `vectorSearch`, `zipWith`
- [shuffle](./shuffle) — Array shuffle

## Infrastructure

- [prompt-cache](./prompt-cache) — Cache prompts and responses (Redis with in-memory fallback)
- [progress-callback](./progress-callback) — Progress event helpers: `batchTracker`, `scopeProgress`, emit utilities
- [debug](./debug) — Debug logging
- [any-signal](./any-signal) — Combine multiple AbortSignals
- [timed-abort-controller](./timed-abort-controller) — AbortController with timeout
- [with-inactivity-timeout](./with-inactivity-timeout) — Abort on inactivity
- [template-replace](./template-replace) — String template interpolation
- [window-for](./window-for) — Calculate sliding windows for batch processing
- [text-batch](./text-batch) — Create text batches by token count

## Chain Support

- [build-instructions](./build-instructions) — Factory for collection instruction builders (spec → map/filter/reduce/find/group)

## Code Analysis

- [search-best-first](./search-best-first) — Best-first tree search algorithm
- [search-js-files](./search-js-files) — Locate and analyze JavaScript files
- [assert](./assert) — Custom assertion utilities
