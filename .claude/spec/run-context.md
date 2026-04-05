# RunContext

## Shape

```
ctx.lib                        — shared local runtime surface
  ctx.lib.verblets             — isomorphic verblets library (shared.js)
  ctx.lib.scripts              — Node.js-dependent utilities
    ctx.lib.scripts.files      — path-based file operations
    ctx.lib.scripts.exec       — automation-to-automation execution
    ctx.lib.scripts.mediaEncoding — content-negotiation metadata
    ctx.lib.scripts.webScrape  — web scraping chain
    ctx.lib.scripts.siteCrawl  — site crawling chain
    ctx.lib.scripts.tileImages, imageToBase64, resizeImage — image utilities
    ctx.lib.scripts.createTempDir, resolveOutputDir — temp file management
    ctx.lib.scripts.process    — explicit termination
  ctx.lib.emit                 — plain progress emitter (top-level for convenience)

ctx.localStorage               — invocation-local and run-local storage
ctx.automationStorage          — persistent per-automation across runs
ctx.domainStorage              — persistent domain/repo-level artifacts
```

## Split Criteria

- **verblets** — useful in automations AND browser UI. No Node.js APIs. Everything from `shared.js`.
- **scripts** — useful in automations but requires Node.js (fs, process, browser automation). Not for browser/UI.
- **Exclude** — the harness itself (automation-runner, RunContext constructor) is not exposed to automations.

## Invariants

- Storage is boring: get/set/has/delete/list with opaque keys. Not fluent, not a reference-builder, not a custom object graph.
- "Reference" means an ordinary in-process JavaScript object reference, not a custom identifier/ref protocol.
- Live runtime objects (emitters, channels) exist in `ctx.lib`, never in storage.
- `ctx.lib.scripts.files` uses real path strings. It is explicitly Node.js-like.
- Invocation parameters are execution inputs. They come from `params`, not from persistent storage.

## Storage API

All three storage domains (`ctx.localStorage`, `ctx.automationStorage`, `ctx.domainStorage`) expose the same interface:

- `get(key)` — returns string or undefined
- `set(key, value)` — writes value (creates intermediate directories as needed)
- `has(key)` — returns boolean
- `delete(key)` — removes the entry
- `list(prefix?)` — returns array of keys, optionally filtered by prefix
- `getJSON(key)` — `get` + `JSON.parse`, returns parsed value or undefined
- `setJSON(key, value)` — `JSON.stringify` + `set`

Keys are opaque strings. `/` is the hierarchical delimiter when structure is needed. Do not assume dots are safe separators. Raw opaque keys are always valid.

### Reserved localStorage Keys

- `ENV` — environment variables relevant to the invocation
- `self` — self-descriptive automation context: `{ name, params, startedAt }`

## ctx.lib.emit

Plain progress emitter built on `createProgressEmitter` from `src/lib/progress/index.js`.

Methods: `start()`, `emit()`, `metrics()`, `complete()`, `error()`, `batch()`.

Automations that need activity query (ring buffer, stats, filtering) create their own using `ctx.lib.verblets.ringBuffer` — this is a documented pattern, not built-in infrastructure.

## ctx.lib.scripts.files

Path-based and straightforward. Ordinary libraries can work with real files and normal paths without adapters.

- `read(path)` — returns string
- `write(path, data)` — writes string or buffer
- `exists(path)` — returns boolean
- `stat(path)` — returns stat object
- `mkdir(path)` — creates directory (recursive)
- `readdir(path)` — returns array of entries
- `glob(pattern, options?)` — returns array of matching paths
- `remove(path)` — deletes file or directory
- `copy(src, dst)` — copies file
- `move(src, dst)` — moves file

Paths are real absolute paths or resolved relative to a configured root directory.

## ctx.lib.scripts.exec

Automation-to-automation execution surface. This is the main composition mechanism.

- `automation(name, params)` — invokes a registered automation by name
- Resolves the automation path from the XDG-backed registry
- Constructs a child RunContext with shared projectRoot and onProgress
- Returns the automation's result

## ctx.lib.verblets

The full isomorphic verblets library (`shared.js`). Includes everything:

- Chains: `map`, `reduce`, `filter`, `find`, `sort`, `group`, `score`, `entities`, `tags`, `relations`, `scale`, `detectPatterns`, `detectThreshold`, etc.
- Verblets: `bool`, `number`, `classify`, `sentiment`, `intent`, `auto`, `expect`, etc.
- LLM: `llm` (callLlm), `jsonSchema`, `buildVisionPrompt`
- Context: `nameStep`, `getOption`, `getOptionDetail`, `getOptions`, `withPolicy`, `createContextBuilder`
- Progress: `createProgressEmitter`, `scopePhase`
- Utilities: `retry`, `parallel`, `parallelMap`, `windowFor`, `ringBuffer`, `createBatches`, `templateReplace`, `pipe`, etc.
- Pure: `chunk`, `compact`, `cosineSimilarity`, `sortBy`, `pick`, `omit`, etc.
- Constants: `constants`, `services`

These are the actual exports from `shared.js`, not wrappers.

## ctx.lib.scripts.process

- `exit(code?)` — explicit termination aligned with the runner.

## Media Encoding Metadata

Sibling API to storage (`ctx.lib.scripts.mediaEncoding`) for viewer and content-negotiation metadata. Associates encodings with stored artifacts:

```javascript
{ type: 'table', sortRowsBy: 'sync:matrix' }
{ type: 'matrix', projection: 'object-property', rowLabel: 'object:name', default: true }
```

Multiple encodings can coexist per artifact.
