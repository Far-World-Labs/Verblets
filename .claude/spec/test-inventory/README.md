# Test inventory

Hand-authored catalog of every test in the verblets repo, used to plan a future migration to a single table-driven shape. Inventory only — no harness, no migrations, no factories yet.

## What it is

Five files in this directory:

- `README.md` — this file. Schema, ID rules, conventions.
- `inventory.json` — flat array of row objects. One row per `it`/`it.each`/`test` call (or per `examples.forEach` row). Source of truth.
- `tables.md` — curated view: each proposed *table group* (rows that share an `inputs`/`want` shape and could share one processor) and its row IDs.
- `factories.md` — recurring fixture shapes that should become fishery factories, organized by family.
- `coverage.md` — counts per surface, per chain, per stress file. Computed gaps must be zero per phase.

## What it isn't

- Not a CHANGELOG. No dates, no per-PR history. Git already has that.
- Not a TODO list. Per-row migration status lives in the migration PRs, not here.
- Not a test plan. No acceptance criteria, no harness design, no schedule.
- Not generated. Hand-authored once. A future PR may add a generator after the schema settles.
- Not authoritative over the tests. When catalog and code disagree, code wins; catalog is updated.

## Surfaces

| Surface | Glob | Runner config | Count (current) |
|---|---|---|---|
| `spec` | `src/**/*.spec.js` | `vitest.config.js` (default) | 170 |
| `examples` | `src/**/*.examples.js` | `vitest.config.examples.js` | 74 |
| `browser-spec` | same as `spec`, jsdom env, exclusions | `vitest.config.browser.js` | (subset of `spec`) |
| `arch` | `index.arch.js` | `vitest.config.arch.js` | 1 |
| `stress` | `/tmp/*-stress.test.mjs` (out-of-tree) | `.tmp.vitest.stress.config.mjs` | 47 |

`browser-spec` rows are not separate rows — each `spec` row that runs in the browser pool gets `browserVariant: true`. The browser exclusion list lives in `vitest.config.browser.js`.

## Row schema

**One row per file** (not per `it()`). The catalog enumerates every test by claim under each file row, but treats the file as the unit of analysis. This keeps `inventory.json` dense (~170 rows for the spec surface, not ~1800), avoids duplicating literal `inputs`/`want` values that already live in the source, and matches how the future migration will land — file-by-file, not test-by-test.

```json
{
  "id": "spec.lib.pave",
  "surface": "spec",
  "file": "src/lib/pave/index.spec.js",
  "currentPattern": "object-driven",
  "rowCount": 11,
  "subject": "pave",
  "claims": [
    "set a nested object value",
    "set a nested array value",
    "set a mixed object and array value",
    "set a value on an existing object",
    "set a value on an existing array",
    "override an existing value in an object",
    "override an existing value in an array",
    "set a value with an empty path (throws)",
    "set a value with an invalid path (throws)",
    "set a value with a single element path on an object",
    "handle numeric-like string keys"
  ],
  "proposedTableGroup": "lib.pave.path-set",
  "processorShape": "(inputs) => pave(inputs.obj, inputs.path, inputs.value)",
  "varyAxes": [],
  "factoryCandidates": [],
  "contractCandidate": null,
  "aiReporterCompat": "n/a",
  "browserVariant": true,
  "stressOrigin": null,
  "notes": "Reference exemplar — already in target shape."
}
```

### Field rules

- **`id`**: `<surface>.<dot-path-from-src-without-extension>`. Lowercase. Repo-unique. Never reused after merge.
  - For paths under `src/`, drop `src.` (so `src/lib/pave/index.spec.js` → `spec.lib.pave`).
  - Drop `.spec.js`/`.examples.js`/`index.js` from the dot-path.
  - Nested non-`index` filenames keep their basename: `src/lib/collection/parallel.spec.js` → `spec.lib.collection.parallel`.
  - For stress files, use `stress.<chain>` from the basename.
  - PRs cite IDs, not line numbers.
- **`surface`**: one of `spec`, `examples`, `arch`, `stress`.
- **`file`**: repo-relative path. For `surface: "stress"` rows this is the *target* spec path the row will land in; the original `/tmp` path goes in `stressOrigin`.
- **`currentPattern`**: dominant pattern in the file. One of:
  - `imperative` — bare `it(name, fn)` with assertions in the body.
  - `it.each-tuple` — `it.each([[label, ...args]])`.
  - `it.each-object` — `it.each([{...}])`.
  - `object-driven` — `examples.forEach(ex => it(ex.name, ...))` shape (target).
  - `contract-registered` — registered in a contract array consumed by `it.each(subjects)`.
  - `streaming` — async generator / `for await` based.
  - `interactive` — `vi.useFakeTimers` driven, sequential time-step assertions.
  - `mixed` — multiple patterns in the same file. The dominant one + `notes` field calling out the others.
- **`rowCount`**: integer. Total `it()` + `it.each()` (counted as their `[...]` arg length) + `test()` calls + `forEach` example object count.
- **`subject`**: the unit under test — function, class, chain, verblet name.
- **`claims`**: array of one-line prose claims, one per test row. Order matches source order. Each claim must read sensibly without context.
- **`proposedTableGroup`**: group ID. Singletons get `"singleton.<id>"`. See `tables.md`.
- **`processorShape`**: one-line pseudocode showing the shared processor signature for the group.
- **`varyAxes`**: empty `[]` for now. Reserved.
- **`factoryCandidates`**: array of factory family names this file's tests would draw from. Use names from `factories.md`.
- **`contractCandidate`**: nullable. Names the contract group this file belongs to (`"object-mapper"`, `"auto-unwrap-schema"`, `"prompt-shaping-forwarding"`).
- **`aiReporterCompat`**: `"required"` for `examples` files that use `getTestHelpers`, `"optional"` for ones that don't, `"n/a"` for `spec`/`stress`/`arch`.
- **`browserVariant`**: boolean. True if this file would execute under `vitest.config.browser.js`.
- **`stressOrigin`**: string or null. Path under `/tmp/` if this row was inventoried from a stress test.
- **`notes`**: free-text. Anything reviewers should know that the structured fields don't capture (mixed-pattern callouts, edge cases, parking-lot questions).

## Why per-file, not per-test

Per-test rows would ~1800 entries with literal `inputs`/`want` duplicating the source. The duplication is load-bearing only for the migration runner (which doesn't exist yet); for the inventory the source is canonical. Per-file rows still answer every planning question — counts, patterns, groupings, factory hot-spots, stress mappings — and stay small enough to scan.

If the migration discovers a need for per-test addressability (e.g. for partial migrations within a file), `claims` is already an ordered list — `<file-id>#<claim-index>` is a stable per-test reference without changing the schema.

## ID examples

| Source | id |
|---|---|
| `src/lib/pave/index.spec.js` | `spec.lib.pave` |
| `src/lib/collection/parallel.spec.js` | `spec.lib.collection.parallel` |
| `src/chains/score/index.spec.js` | `spec.chains.score` |
| `src/chains/score/index.examples.js` | `examples.chains.score` |
| `/tmp/calibrate-stress.test.mjs` | `stress.calibrate` |
| `index.arch.js` | `arch.repo` |

## How `inventory.json` is produced

Three small scripts in this directory drive the inventory:

| Script | Role |
|---|---|
| `scan.mjs` | Walks `src/` for `*.spec.js` and `*.examples.js`. Computes `id`, `surface`, `file`, `currentPattern`, `rowCount`, `subject`, `claims`, `aiReporterCompat`, `browserVariant`. Leaves judgement fields blank. |
| `scan-stress.mjs` | Appends rows for `/tmp/*-stress.test.mjs` (with `stressOrigin` + target spec path) and `index.arch.js`. |
| `enrich.mjs` | Hand-curated heuristics fill `proposedTableGroup`, `processorShape`, `factoryCandidates`, `contractCandidate`. |
| `derive.mjs` | Generates `tables.md`, `factories.md`, `coverage.md` from the populated `inventory.json`. |

Run order to regenerate from scratch:

```sh
rm .claude/spec/test-inventory/inventory.json
node .claude/spec/test-inventory/scan.mjs > .claude/spec/test-inventory/inventory.json
node .claude/spec/test-inventory/scan-stress.mjs
node .claude/spec/test-inventory/enrich.mjs
node .claude/spec/test-inventory/derive.mjs
```

The scripts are deterministic and read-only on the source tree. They live under `.claude/spec/test-inventory/` rather than `scripts/` because they're authoring tooling for this catalog only — not part of the library or its build.

## Authoring order (per-phase)

The scripts cover all phases in one shot, but the conceptual order is:

1. `src/lib/**/*.spec.js` — smallest, mostly pure.
2. `src/verblets/**/*.spec.js` + `src/embed/**/*.spec.js` + `src/services/**/*.spec.js` + `src/constants/**/*.spec.js` + `src/prompts/**/*.spec.js` + `src/init.spec.js` — single-purpose.
3. `src/chains/**/*.spec.js` — biggest; most contract candidates land here.
4. `src/**/*.examples.js` — annotate `getTestHelpers`/budget gating.
5. `index.arch.js` + browser-variant exclusion list.
6. `/tmp/*-stress.test.mjs` — many rows per file; some target chains that lack an `index.spec.js` (the migration creates them).

`coverage.md` reports the result at the end of every run.

## AI reporter compatibility

The reporter (`src/chains/test-analysis/`) parses `testName` and `suite` strings from logged events. There are **no constraints on test name shape** — table-driven row names like `"set-nested-object"` or `"add (a=1, b=10)"` are fine. The constraint is structural: `*.examples.js` files must use `getTestHelpers(suite)` (per `.claude/guidelines/example-tests.md`). When a row migrates, that wrapping must be preserved.

## Coverage verification

`coverage.md` records the result of three counts that must equal the inventory:

```sh
find src -name '*.spec.js' | wc -l
find src -name '*.examples.js' | wc -l
ls /tmp/*-stress.test.mjs 2>/dev/null | wc -l
```

Per-file row counts must equal `grep -cE '\bit\(|\bit\.each\(|\btest\(' <file>` — exception: `forEach`-driven `examples` arrays count rows in the array, not the single `forEach` call.

## Open decisions for the migration PRs (out of scope here)

These are recorded so this PR doesn't silently lock them in. Any catalog row whose interpretation depends on these is marked in `notes`.

- Whether to add `fishery` and `fast-check` as dev dependencies.
- Whether stress rows merge into the existing `*.spec.js` per module, become a sibling `*.stress.spec.js`, or get a separate vitest config.
- Whether the harness lives in `src/lib/test-utils/` or a new top-level `src/lib/examples-runner/`.
- Whether contract files keep their `.spec.js` naming or switch to e.g. `.contract.spec.js` for clarity.
