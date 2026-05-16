# Automation — Implementation Details

## Pragma

- **include:** discovery/registry, code location, storage backing, RunContext construction, module locations, import resolution, CLI entry
- **exclude:** per-automation implementation, prompt templates, scoring specs

---

## Discovery and Registry

Automations are registered in an XDG-backed registry at `$XDG_CONFIG_HOME/verblets-automations/registry.json`. Each entry maps a name to an absolute path. Registry module: `src/lib/automation-registry/index.js` exporting `register`, `unregister`, `list`, `resolve`, `updateStats`. Writes are atomic (write temp → rename).

## Automation Code Location

Automation directories are registered by absolute path — they can live anywhere on the filesystem. Each contains: `index.js` (exports `{ run }`), co-located modules loaded by the runner as `params._modules`, and a `schemas/` directory loaded as `params.schemas`.

Templates are loaded from `$VERBLETS_DATA_ROOT/<name>/` and `$VERBLETS_DATA_ROOT/shared/` as `params.templates`. Data root defaults to `$XDG_DATA_HOME/verblets/automations`.

## Import Resolution

The ESM loader hook at `src/lib/automation-runner/loader.js` handles `@app/*` → `src/lib/*/index.js` and bare `.json` imports → adds `{ type: 'json' }` attribute. Invoked via `node --import ./src/lib/automation-runner/loader.js`.

## Storage Backing

All storage domains use XDG-backed local filesystem under `$XDG_DATA_HOME/verblets-automations/`. Layout: `<automation-name>/automation/` for automationStorage, `domain/` for domainStorage, `_runs/<name>-<ISO-timestamp>/` for localStorage. Keys map to file paths under the base. Subdirectories are created as needed.

## RunContext Module

`src/lib/run-context/index.js` exports the `RunContext` class. Supporting modules in the same directory: `data-store.js` (createDataStore), `file-ops.js` (createFileOps), `emit.js` (createEmit), `exec.js` (createExec), `media-encoding.js` (createMediaEncoding).

## RunContext Construction

The runner constructs RunContext — automations never construct it directly. Construction sequence: resolve XDG paths for storage domains → create filesystem-backed storage domains → populate localStorage with `ENV` and `self` → create emit (plain progress emitter) → create files (fs/promises wrapper) → create exec (automation-to-automation via registry) → set verblets to the full `shared.js` import → attach Node-only utilities to scripts.

## Runner Module

`src/lib/automation-runner/index.js` exports `discoverAutomations()` and `runAutomation(name, params?, options?)`. The runner enriches params with merged templates (shared + automation-specific), parsed JSON schemas, and imported JS modules before passing to the automation's `run` function.

## ctx.lib.emit

Plain `createProgressEmitter` result. No ring buffer, no query surface. Automations needing activity query create their own ring buffer via `ctx.lib.verblets.ringBuffer`.

## ctx.lib.scripts

Node.js-dependent utilities: files (createFileOps wrapping fs/promises), exec (automation-to-automation via XDG registry), mediaEncoding (viewer metadata), webScrape, siteCrawl, image utilities (tileImages, imageToBase64, resizeImage), temp file management (createTempDir, resolveOutputDir), process.exit for explicit termination.

## ctx.lib.verblets

The entire isomorphic library surface via `shared.js` import. Not a curated subset, not wrappers.

## CLI Entry

Primary interface is `node --import ./src/lib/automation-runner/loader.js` with an inline import of `runAutomation`. When the shell has stale API keys, unset and re-source `.env` before invocation.
