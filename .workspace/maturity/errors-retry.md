# §1k Errors & Retry

> Steven: "errors and retry are arguably many dimensions or at least have a lot
> of detail between tiers (assertions, ai assertions, using js custom error
> objects, error forwarding where relevant, logs attached, well-designed
> vocabulary across the platform as a whole or good design of errors for
> particular verblets/chains, the maturity here involves us learning more
> ourselves, etc)"

This dimension is less well-understood than others. We're learning what
maturity looks like here as we go.

## Levels (draft — expect these to evolve)

| Level | Description | Example |
|-------|-------------|---------|
| 0 | No error handling, crashes propagate raw | themes (no try/catch, no retry) |
| 1 | Basic retry via `lib/retry` with default 429-only policy | people, list, most simple chains |
| 2 | Input validation + retry + defined failure mode (undefined, empty, rethrow) | map (undefined-fill), filter (rethrow), find (continue) |
| 3 | Multi-level retry, conditional retry, error context attached to results | map (batch + item retry), category-samples (retryCondition callback) |
| 4 | Custom error types, error vocabulary, logs attached, forwarding context | — (nobody here yet) |

## Sub-concerns

This is really several interrelated things:

### Retry strategy
- 429-only (default) vs `retryOnAll` vs conditional (`retryCondition` callback)
- Batch-level retry vs item-level retry (map does both)
- `retryDelay * attempt` — no jitter, no exponential backoff

### Failure mode design
Three distinct strategies observed across chains:
- **Swallow as undefined** — map marks failed items as `undefined`, retries them
- **Rethrow** — filter throws after batch failure
- **Graceful fallback** — split returns original chunk, group returns empty

These are design choices, not bugs. But they're undocumented — consumers
don't know what to expect when a chain fails.

### Input validation
- 18 chains validate inputs with `throw`
- Most silently degrade (return empty arrays on bad input)
- `anonymize` has the most formal validation: extracted `validateInput()` function
- No chains use custom Error subclasses
- No chains attach structured context to errors

### Error vocabulary
No project-wide error types. Every chain throws generic `Error`. Ideas:
- `VerbletError` base class with chain name, phase, input summary
- `RetryExhaustedError` with attempt count, last error
- `BatchError` with failed item indices, partial results
- `SpecGenerationError` for spec/apply failures

### Assertions (testing dimension overlap)
- Standard `expect()` — vitest built-in
- `aiExpect` — AI-powered assertions for semantic checking
- `ai-arch-expect` — architectural assertions across files
- Each has different error reporting, different retry behavior
- Test errors are domain-specific, not the same as runtime errors

### Error observability
- Most chains don't log errors (just throw or swallow)
- `lifecycle-logger` has `logError` but few chains use it
- `retry` lib emits `{event: 'error'}` progress events
- No correlation between error events and the items that caused them

## What we need to learn

Steven's right that maturity here involves learning more ourselves:
- What error information do consumers actually need?
- Should error design be per-chain or platform-wide?
- How do errors compose when chains call chains?
- What does "good error design" look like for an LLM-powered function
  that might fail non-deterministically?
