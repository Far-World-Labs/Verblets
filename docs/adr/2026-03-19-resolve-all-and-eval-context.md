# Batch Resolution with `getOptions` and Rename `optionContext → evalContext`

After 8 commits of config-surface widening, every async chain repeated ~15 lines of destructure-suppress-resolve boilerplate. The word "context" was overloaded between LLM prompt context (what chains like category-samples, disambiguate use) and dynamic config evaluation context (what `policy` functions receive). This pass addresses both.

## Context

The option resolution system introduced `getOption`, `getOptions`, and `scopeOperation` to support lazy config evaluation with operation-scoped context. Each chain needed:

1. A destructure block with `_`-prefixed suppressions for every resolvable option (to avoid passing raw values to sub-calls)
2. Individual `getOption()` calls for each option
3. A `...options` rest spread for threading config to sub-calls

A typical chain had 15+ lines just to extract 6 options. With 42 async chains, this was ~600 lines of boilerplate with identical structure.

Separately, `optionContext` (the object carrying `operation` and domain attributes through the resolve pipeline) shared the word "context" with LLM prompt context — a different concept used throughout the codebase.

## Decisions

| Decision | Reason | Rejected Alternative |
|---|---|---|
| `getOptions(config, spec)` as a batch resolver | Replaces N individual `getOption` calls with one call. The spec object maps option names to fallbacks (plain values) or `withPolicy(mapperFn)` wrappers. Returns an object with resolved values. | `getOptionsSync` for sync chains (only 4 sync chains with 1-2 options each — not worth a separate function), batch middleware/decorator pattern (over-engineering for what is a loop over `getOption`) |
| `withPolicy(fn)` marker to distinguish mappers from plain objects | A spec entry like `{ strictness: withPolicy(mapStrictness) }` is unambiguous — the `__policy` tag distinguishes it from a plain object fallback. Without this, `getOptions` couldn't tell whether `{ guidance: undefined, errorPosture: 'strict' }` is a fallback object or a mapper function result. | Using the entry's type (functions are mappers, objects are fallbacks) — breaks because fallbacks can also be `undefined`, and a mapper IS a function but needs different handling than a fallback. Symbol-based tagging — heavier than a simple boolean flag for no practical benefit. |
| `withPolicy` override keys flatten sub-properties into the result | `withPolicy(mapEffort, ['extremeK', 'iterations', 'selectBottom'])` resolves the parent key through the mapper, then individually resolves each override key with the mapper's output as fallback. Only the flattened sub-keys appear in the result — the parent key is excluded. This lets consumers override any sub-property directly on config. | Including the parent key in the result alongside sub-keys (ambiguous which takes precedence), requiring consumers to manually resolve sub-keys after `getOptions` (defeats the batch purpose) |
| Dependent resolutions stay as individual `getOption()` calls after `getOptions` | 10 chains have options whose fallback depends on a mapped result (e.g., `errorPosture` defaults to `strictness.errorPosture`). These can't go in the spec because the fallback isn't known until the mapper runs. Keeping them as explicit `getOption()` calls makes the dependency visible. | Including dependent resolutions in `getOptions` with a dependency graph (over-engineering — the number of dependencies per chain is 1-3, a sequential call is clearer than a graph), two-pass `getOptions` (adds complexity for a pattern that only affects 10 of 42 chains) |
| Config values read from `config.xxx` instead of destructured | With `getOptions`, there's no need for a big destructure block. Non-resolved values (`logger`, `onProgress`, `abortSignal`, `now`) are read directly as `config.logger`, `config.onProgress`, etc. Config is passed directly to sub-calls and to callLlm — no `{ llm, ...options }` spread needed. | Keeping the destructure for non-resolved values (defeats the purpose — the destructure was the boilerplate), a separate `pick` call for non-resolved values (adds a step for values that are just read-through) |
| Rename `optionContext → evalContext` | "Context" unqualified should mean LLM prompt context in this codebase. The evaluation context for `policy` functions needs an explicit qualifier. `evalContext` is short, descriptive, and won't collide. | `resolveContext` (longer, and "resolve" already overloaded), `configContext` (ambiguous — could mean the config object itself), keeping `optionContext` (perpetuates the ambiguity) |
| Blast radius limited to 2 files for rename | `optionContext` was only referenced in `option.js` (9 occurrences) and `option.spec.js` (17 occurrences). No chain file references it directly — they call `scopeOperation` which manages it internally. No markdown or spec files reference it. | Renaming all "context" references (too broad — LLM prompt context is the correct use of the word elsewhere) |

## API surface

Four exports from `src/lib/context/option.js`:

- **`getOption(name, config, fallback)`** — async, checks `config.policy[name]` (function) → `config[name]` → `fallback`
- **`getOptions(config, spec)`** — batch-get; spec values are plain fallbacks or `withPolicy(mapperFn, overrides?)`
- **`withPolicy(fn, overrides?)`** — tags mapper for `getOptions`; when overrides present, only the flattened sub-keys appear in the result
- **`scopeOperation(name, config)`** — scopes config with hierarchical operation name in `config.operation`, defaults `now` to `new Date()`

Policy functions receive `(operation, { logger })`. The `operation` string composes hierarchically with `/` (e.g. `'document-shrink/score'`).

## Consequences

- **46 chain/verblet files** migrated from individual resolve calls to `getOptions`
- **4 sync chains** (dismantle, socratic, conversation, set-interval) use `getOption` directly with 1-2 options each
- `retry()` is config-aware — resolves `maxAttempts`, `retryDelay`, `retryOnAll` from config via `getOption`, eliminating the need for chains to resolve and forward retry params
- `callLlm` resolves `llm` and all model keys from config via `getOption` — chains pass config directly without extracting `llm`
- New chain authors use `getOptions` + `withPolicy` as the default pattern; `getOption` is only needed for dependent resolutions
- `evalContext` was the canonical name for the dynamic config evaluation context at time of writing

**Note (Phase 2 refactor):** `evalContext` was subsequently split into two concerns. The `operation` field — a hierarchical string like `'document-shrink/score'` — moved to `config.operation` directly. Targeting context (domain, tenant, plan, and other attributes that flag services and classifiers need) is no longer threaded through config at all; it is curried into policy functions at the definition site. Policy functions now receive `(operation, { logger })` instead of `(evalContext, { logger })`. `nameStep` sets `config.operation`.

**Note (Phase 3 refactor):** Config enrichment and lifecycle tracking were separated into two functions. `nameStep(name, config)` is pure config enrichment — adds `operation` path and `now` timestamp. `track(name, config)` emits `chain:start` and returns a lifecycle handle with `result()` and `error()`. Convention: `const run = nameStep(name, config); const span = track(name, run);`.
