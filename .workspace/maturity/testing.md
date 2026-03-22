# §1e Testing

## Levels

| Level | Description |
|-------|-------------|
| 0 | No tests |
| 1 | Basic smoke test or example |
| 2 | Example tests using vitest core wrappers, cover happy path |
| 3 | Unit tests + example tests, cover edge cases, test error paths |
| 4 | Unit + example + aiExpect/ai-arch-expect, property-based tests, regression tests |

## Coverage snapshot

**100% of chains have at least some testing.** No chain has zero tests.

- 41 chains have both unit tests (`.spec.js`) and example tests (`.examples.js`)
- 10 chains have example tests only (no `.spec.js`):
  ai-arch-expect, category-samples, central-tendency, detect-threshold,
  extract-features, intersections, scan-js, test-advice, test-analysis,
  test-analyzer

## aiExpect usage

41 chains use `aiExpect` in their example tests for semantic validation
via `.toSatisfy(constraint)`. This is the dominant assertion pattern for
verifying LLM output quality beyond structural correctness.

## ai-arch-expect usage

Only the ai-arch-expect chain itself exercises architectural testing.
Tests are typically skipped for performance (multiple LLM calls per assertion).
Provides `fileContext`, `jsonContext`, `dataContext` builders for validating
file structure and code patterns against architectural constraints.

## Test wrapper patterns

Three wrapper signatures in use (competing patterns):

1. **`wrapIt`/`wrapExpect`** — Simple wrapping (map, extract-blocks)
2. **`wrapIt`/`wrapExpect`/`wrapAiExpect`** — Full suite (conversation,
   list, dismantle, anonymize, category-samples, tags, relations)
3. **`makeWrappedIt`/`makeWrappedExpect`/`makeWrappedAiExpect`** — Newer
   factory pattern (central-tendency, extract-blocks, tags)

All conditionally activate based on `getConfig()?.aiMode`, integrating
with the test-analysis pipeline for structured event capture.

## Largest test suites

| Chain | Unit tests | Lines | Example scenarios |
|-------|-----------|-------|-------------------|
| relations | 31 tests | 386 | 14 examples |
| llm-logger | 16 tests | 391 | — |
| expect | 18 tests | 348 | — |
| tags | 18 tests | 288 | — |
| timeline | 16 tests | 276 | — |
| scale | — | — | 8 examples (446 lines) |
| conversation | — | — | 2 deep scenarios (420 lines) |
| glossary | — | — | 6 examples (382 lines) |

## Observations

- The dual-layer testing model (unit tests mock the LLM, example tests
  call it) is well-established but undocumented as a convention.
- 10 chains without unit tests rely entirely on LLM calls — slower, flakier,
  harder to debug. These are all Standard/Development tier where it matters less.
- Three competing wrapper signatures suggest the pattern is still evolving.
  Worth converging on one approach.
- Test analysis infrastructure (logging.md "Test Logging Pipeline") is
  sophisticated but adoption is uneven across chains.
