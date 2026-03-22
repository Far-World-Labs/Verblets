# §1g Code Quality

## Levels

| Level | Description |
|-------|-------------|
| 0 | Works but has known issues (dead code, unclear logic, mixed concerns) |
| 1 | Functions correctly, follows basic style conventions |
| 2 | Clean: no dead code, clear naming, extracted pure functions, no magic numbers |
| 3 | Well-structured: separated concerns, composable internals, explicit transformations |
| 4 | Reference-quality: could be studied as an example of good chain implementation |

## Core tier assessment

| Chain | Lines | Level | Notes |
|-------|-------|-------|-------|
| map | 308 | 3-4 | Well-separated: `mapOnce` (core) vs `map` (orchestration). Comprehensive lifecycle logging. No dead code. |
| filter | 217 | 3 | Clean concern separation. Response format isolated. Minor: `substring(0, 50)` and `substring(0, 500)` logging previews are magic numbers. |
| sort | 238 | 2-3 | Good algorithm structure. `console.warn` instead of logger. `createModelOptions` duplicated from other chains. Ramda imported for just `R.splitEvery`. |
| score | 249 | 3 | Spec-based architecture. Multiple extracted pure instruction builders. Calibration utilities factored out. |
| group | 246 | 3 | Clean two-phase design (discovery → assignment). Extracted prompt builders. Good fallback to 'other' category. |
| reduce | 157 | 3 | Intentionally minimal. Does one thing well. Response format logic cleanly isolated. |
| entities | 295 | 4 | Reference quality. Consistent instruction builder pattern. Factory with `Object.defineProperty` for introspection. Clean spec/apply split. |

## Standard tier sample

| Chain | Lines | Level | Notes |
|-------|-------|-------|-------|
| glossary | 85 | 3 | Clean pipeline: chunk → map → dedupe → sort → limit. Extracted defaults. |
| themes | 29 | 3 | Elegant: two-pass reduce refinement in 29 lines. |
| veiled-variants | 107 | 2 | Cascading JSON parse fallbacks are complex but justified. `console.warn`, magic numbers (`length > 200`, `length > 20`). |
| anonymize | 409 | 3 | Multi-stage architecture with extracted validators and stage prompts. Has documented TODO re: filter limitation. |
| socratic | 228 | 3 | OOP with dependency injection for ask/answer functions. Lifecycle logging. Clean state management. |
| disambiguate | 123 | 2-3 | Manual max-finding loop. `createModelOptions` duplicated from sort. |

## Recurring issues

**`console.warn` instead of logger:** sort, veiled-variants. Breaks
consistent logging and isomorphic compatibility.

**Magic numbers in logging previews:** `substring(0, 50)` and
`substring(0, 500)` appear across filter, map, group, reduce for debug
context. Should be named constants.

**`createModelOptions` duplication:** sort and disambiguate both create
model options objects with the same pattern. Not extracted to shared utility.

**Hardcoded parse thresholds:** veiled-variants uses `length > 200` and
`length > 20` for fallback parsing decisions. Should be named constants.

## Observations

- No dead code found in any surveyed chain. The codebase is clean.
- Naming is consistently strong — camelCase throughout, semantic function
  names, descriptive variable names.
- The largest chains (map 308, anonymize 409, entities 295) are large
  because they do more, not because they're bloated.
- Core chains average level 3. No chain scored below level 2.
- The spec-pattern chains (score, entities, anonymize) have the best
  internal organization — the pattern forces good separation.
