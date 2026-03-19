# Batch Resolution with `resolveAll` and Rename `optionContext → evalContext`

After 8 commits of config-surface widening, every async chain repeated ~15 lines of destructure-suppress-resolve boilerplate. The word "context" was overloaded between LLM prompt context (what chains like category-samples, disambiguate use) and dynamic config evaluation context (what `optionValue`/`optionAsyncValue` functions receive). This pass addresses both.

## Context

The option resolution system introduced `resolve`, `resolveMapped`, and `withOperation` to support lazy config evaluation with operation-scoped context. Each chain needed:

1. A destructure block with `_`-prefixed suppressions for every resolvable option (to avoid passing raw values to sub-calls)
2. Individual `resolve()` or `resolveMapped()` calls for each option
3. A `...options` rest spread for threading config to sub-calls

A typical chain had 15+ lines just to extract 6 options. With 42 async chains, this was ~600 lines of boilerplate with identical structure.

Separately, `optionContext` (the object carrying `operation` and domain attributes through the resolve pipeline) shared the word "context" with LLM prompt context — a different concept used throughout the codebase.

## Decisions

| Decision | Reason | Rejected Alternative |
|---|---|---|
| `resolveAll(config, spec)` as a batch resolver | Replaces N individual `resolve`/`resolveMapped` calls with one call. The spec object maps option names to fallbacks (plain values) or `mapped(mapperFn)` wrappers. Returns an object with resolved values. | `resolveAllSync` for sync chains (only 4 sync chains with 1-2 options each — not worth a separate function), batch middleware/decorator pattern (over-engineering for what is a loop over `resolve`) |
| `mapped(fn)` marker to distinguish mappers from plain objects | A spec entry like `{ strictness: mapped(mapStrictness) }` is unambiguous — the `__mapped` tag distinguishes it from a plain object fallback. Without this, `resolveAll` couldn't tell whether `{ guidance: undefined, errorPosture: 'strict' }` is a fallback object or a mapper function result. | Using the entry's type (functions are mappers, objects are fallbacks) — breaks because fallbacks can also be `undefined`, and a mapper IS a function but needs different handling than a fallback. Symbol-based tagging — heavier than a simple boolean flag for no practical benefit. |
| Dependent resolutions stay as individual `resolve()` calls after `resolveAll` | 10 chains have options whose fallback depends on a mapped result (e.g., `errorPosture` defaults to `strictness.errorPosture`). These can't go in the spec because the fallback isn't known until the mapper runs. Keeping them as explicit `resolve()` calls makes the dependency visible. | Including dependent resolutions in `resolveAll` with a dependency graph (over-engineering — the number of dependencies per chain is 1-3, a sequential call is clearer than a graph), two-pass `resolveAll` (adds complexity for a pattern that only affects 10 of 42 chains) |
| Config values read from `config.xxx` instead of destructured | With `resolveAll`, there's no need for a big destructure block. Non-resolved values (`logger`, `onProgress`, `abortSignal`, `now`, `listStyle`) are read directly as `config.logger`, `config.onProgress`, etc. Sub-calls use `{ ...config, llm }` instead of `{ llm, ...options }`. | Keeping the destructure for non-resolved values (defeats the purpose — the destructure was the boilerplate), a separate `pick` call for non-resolved values (adds a step for values that are just read-through) |
| Rename `optionContext → evalContext` | "Context" unqualified should mean LLM prompt context in this codebase. The evaluation context for `optionValue`/`optionAsyncValue` functions needs an explicit qualifier. `evalContext` is short, descriptive, and won't collide. | `resolveContext` (longer, and "resolve" already overloaded with the `resolve` function), `configContext` (ambiguous — could mean the config object itself), keeping `optionContext` (perpetuates the ambiguity) |
| Blast radius limited to 2 files for rename | `optionContext` was only referenced in `resolve.js` (9 occurrences) and `resolve.spec.js` (17 occurrences). No chain file references it directly — they call `withOperation` which manages it internally. No markdown or spec files reference it. | Renaming all "context" references (too broad — LLM prompt context is the correct use of the word elsewhere) |

## Consequences

- **43 chain/verblet files** migrated from individual resolve calls to `resolveAll`
- **4 sync chains** (dismantle, socratic, conversation, set-interval) unchanged — they use `resolveOption`/`resolveOptionMapped` with 1-2 options each
- `resolveMapped` and `resolveOptionMapped` remain available (used internally by `resolveAll`, and directly by sync chains) but are no longer imported by any async chain
- New chain authors use `resolveAll` + `mapped` as the default pattern; `resolve` is only needed for dependent resolutions
- `evalContext` is the canonical name for the dynamic config evaluation context going forward
