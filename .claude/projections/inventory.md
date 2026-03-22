# Verblets — Inventory

> 360 source files. 109 test suites. 1250 tests. All passing.
> For humans navigating the codebase. Companion to `landscape.md` (identity projection).

---

## Architecture at a Glance

```
                    shared.js — 130+ public exports
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     21 verblets    49 chains      63 lib/
     one LLM call   orchestrate    pure utilities
     crash clean    retry, state   (except lib/llm/)
          │              │              │
          └──────────────┼──────────────┘
                         │
              constants/  services/  prompts/
              model catalog, Redis, prompt text
```

**Entry**: `index.js` (Node), `index.browser.js` (browser) — both re-export `shared.js`.

---

## Verblets — 21 Single-Call Functions

Each makes exactly one LLM call. No retries, no state, no async forks.

| Family | Functions | What they do |
|--------|-----------|-------------|
| **Type extractors** | `bool`, `number`, `date`*, `enum`, `numberWithUnits` | Text → typed value |
| **Name extractors** | `name`, `nameSimilarTo` | Text → concise label |
| **Classifiers** | `sentiment`, `intent` | Text → category |
| **Generators** | `listBatch`, `listExpand`, `commonalities`, `fillMissing`, `auto`, `schemaOrg` | Prompt → structured output |
| **RAG transforms** | `embedRewriteQuery`, `embedMultiQuery`, `embedStepBack`, `embedSubquestions` | Query → better queries |
| **Meta** | `phailForge`, `expect`, `centralTendencyLines` | Prompt improvement, assertion, scoring |

*`date` is technically a chain but behaves like a verblet.

---

## Chains — 49 Orchestrators

### Spec/Apply Family (6 chains)

Generate a specification once, apply it many times. Each exports the same 5 instruction builders for collection chain integration.

| Chain | Spec produces | Apply does |
|-------|--------------|-----------|
| `scale` | scoring rubric | rate items 0–1 against it |
| `entities` | type taxonomy | extract typed entities |
| `relations` | relation schema | extract RDF-compatible triples |
| `tags` | vocabulary | tag items from vocabulary |
| `score` | rubric (wraps scale) | batch score items |
| `anonymize` | anonymization rules | redact at strict/balanced/light levels |

**Shared surface per chain**: `chainSpec()`, `applyChain()`, `createChain()`, plus `mapInstructions`, `filterInstructions`, `reduceInstructions`, `findInstructions`, `groupInstructions`.

### Collection Family (7 chains)

Batch-process lists with natural language predicates. All support `.with()` for curried composition.

`map` · `filter` · `reduce` · `find` · `group` · `sort` · `join`

### Prompt Shaping (1 chain + 3 lib modules)

Three-layer architecture for programmatic prompt construction:

| Layer | Module | Role |
|-------|--------|------|
| Text surgery | `lib/prompt-markers` | `extractSections`, `insertSections` (+ `listSlots`, `fillSlots` as `_test` exports) |
| Piece model | `lib/prompt-piece` | `createPiece`, `addInput`, `removeInput`, `render`, `matchSources`, `pendingInputs`, `isReady`, `ambiguousInputs` |
| Routing algorithms | `lib/prompt-routing` | `promptConnectParts`, `promptRunOrder`, `promptConnectDownstream`, `promptConnectUpstream`, `promptDetectCycles` |
| LLM advisor | `chains/extend-prompt` | `promptPieceReshape`, `promptPieceProposeTags`, `promptTagSource`, `promptTagReconcile`, `promptTagConsolidate` |

### Content & Analysis (26 chains)

**Dialogue**: `conversation` (class), `conversationTurnReduce`, `socratic` (class)

**Text processing**: `documentShrink`, `summaryMap` (class, extends Map), `split`, `truncate`, `join`, `toObject`, `extractBlocks`

**Discovery**: `disambiguate`, `glossary`, `collectTerms`, `themes`, `questions`

**Statistical**: `centralTendency`, `detectPatterns`, `detectThreshold`, `intersections`

**Extraction**: `extractFeatures`, `timeline`, `people`, `popReference`

**Generation**: `categorySamples`, `veiledVariants`, `filterAmbiguous`, `list`

**Taxonomy**: `tagVocabulary`, `dismantle`

### Infrastructure (6 chains)

`llmLogger` · `setInterval` · `embedExpandQuery` · `scanJs` · `aiArchExpect`

### Test System (4 chains — large subsystem)

`test` · `testAdvice` · `testAnalysis` · `testAnalyzer`

The `test-analysis/` directory is the largest subsystem (~40 files) with its own processors, collectors, views, intent handlers, and coordinator architecture.

---

## Library Layer — 63 Modules

Pure utilities. No LLM calls except `lib/llm/` itself.

### Core Runtime
| Module | Purpose |
|--------|---------|
| `llm/` | LLM call orchestration, provider abstraction (OpenAI, Anthropic, OpenWebUI), structured output with auto-unwrap |
| `normalize-llm/` | String → `{modelName}` normalization (3 lines) |
| `retry/` | Configurable retry with delay and abort |
| `progress-callback/` | Progress event emission for batch workflows (12 exported helpers) |
| `debug/` | stderr logging when `VERBLETS_DEBUG` set |
| `env/` | Isomorphic environment variable access |

### Data & Composition
`pure/` (last, compact, pick, omit, chunk, unionBy, zipWith) · `pipe/` · `functional/` · `shuffle/` · `combinations/` · `pave/` · `template-replace/`

### Buffers
`ring-buffer/` (in-memory) · `ring-buffer-redis/` (Redis-backed) · `ring-buffer-shared/` (pure calculations)

### Text Processing
`chunk-sentences/` · `shorten-text/` · `text-batch/` · `text-similarity/` · `strip-response/` · `strip-numeric/` · `parse-llm-list/` · `embed-normalize-text/`

### LLM Output Parsers
`to-bool/` · `to-number/` · `to-date/` · `to-enum/` · `to-number-with-units/`

### Embedding & Search
`embed/` · `embed-neighbor-chunks/` · `search-best-first/` · `search-js-files/` · `prompt-cache/`

### Code Analysis
`parse-js-parts/` · `code-extractor/` · `extract-strings/` · `topological-imports/` · `find-dependencies/` · `dependency-cruiser/` · `path-aliases/` · `find-project-root/` · `each-dir/` · `each-file/`

### Process & IO
`parallel-batch/` · `any-signal/` · `timed-abort-controller/` · `with-inactivity-timeout/` · `window-for/` · `lifecycle-logger/` · `log-adapter/` · `logger/` · `logger-service/` · `editor/` · `transcribe/` · `crypto/` · `version/` · `assert/`

---

## Supporting Infrastructure

### Constants (`src/constants/`)
- `common.js` — timeouts, retry defaults, truthy/falsy lists, `CAPABILITY_KEYS`
- `models.js` — model catalog (GPT-4.1, Claude 4.5/4.6, Gemma, Qwen), 50+ aliases, capability mappings
- `messages.js` — error message constants
- `arch.js`, `arch-debug.js` — architecture assertion constants

### Services (`src/services/`)
- `llm-model/` — ModelService singleton: `resolveModel(llm)`, `getCapabilities(modelKey)`, negotiation, global overrides
- `redis/` — client getter/setter, isomorphic

### Prompts (`src/prompts/`) — 24 modules
Format directives (`asEnum`, `asJSONSchema`, `asObjectWithSchema`) · content generation (`generateList`, `generateCollection`, `blogPost`) · data shaping (`sort`, `style`, `wrapList`, `wrapVariable`) · 120+ string constants for output format, reasoning, critique

### JSON Schemas (`src/json-schemas/`)
Reusable schema definitions for structured LLM output.

---

## Recurring Conventions

| Convention | Where it appears |
|-----------|-----------------|
| `(input, config = {})` with destructured `{ llm, maxAttempts, onProgress, abortSignal }` | Every async function |
| `emitStepProgress` / `emitComplete` | All chains |
| JSON schemas with `items` (array) or `value` (object) wrapper keys | All structured output; LLM auto-unwraps |
| Spec/Apply: generate once, apply many | 6 extraction chains |
| `.with(config)` → curried unary function | Collection chains, prompt shaping |
| `withX(config)(target)` — config-first pipe helpers | prompt-piece |
| No null at boundaries | Project-wide invariant |
| Verblets crash; chains retry | Architectural boundary |
| Isomorphic browser + Node | All modules |

---

## Scale

| Category | Count |
|----------|-------|
| Verblets | 21 |
| Chains | 49 |
| Library modules | 63 |
| Prompt modules | 24 |
| Source files | 360 |
| Test suites | 109 (464 including sub-suites) |
| Tests | 1,200 |
| Public exports (shared.js) | ~130 |
