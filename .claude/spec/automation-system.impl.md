# Automation System — Implementation Details

## Discovery & Registry

Automations are registered in an XDG-backed registry at `~/.config/verblets-automations/registry.json`. Each entry maps a name to an absolute path where the automation code lives.

```json
{
  "version": 1,
  "automations": {
    "eventing-quality": {
      "path": "/home/steven/projects/fwl/verblets-automations/eventing-quality",
      "registeredAt": "2026-04-04T...",
      "lastRun": "2026-04-04T...",
      "runCount": 16
    }
  }
}
```

Registry module: `src/lib/automation-registry/index.js`
Exports: `register(name, path)`, `unregister(name)`, `list()`, `resolve(name)`, `updateStats(name, data)`.
Writes are atomic (write temp → rename).

## Automation Code Location

Automations live in `~/projects/fwl/verblets-automations/<name>/`. Each directory contains:
- `index.js` — exports `{ run }` (pure sandboxed function, no static imports)
- Co-located modules (e.g., `criteria.js`) loaded by the runner as `params._modules`
- `schemas/` — JSON schemas loaded by the runner as `params.schemas`

Templates are loaded from `~/data/verblets/automations/<name>/` and `~/data/verblets/automations/shared/` as `params.templates`.

## Import Resolution

The ESM loader hook at `src/lib/automation-runner/loader.js` handles:
- `@app/*` → `src/lib/*/index.js`
- Bare `.json` imports → adds `{ type: 'json' }` attribute

```bash
node --import ./src/lib/automation-runner/loader.js -e "import { runAutomation } from './src/lib/automation-runner/index.js'; ..."
```

## Storage Backing

All storage domains use XDG-backed local filesystem:

```
~/.local/share/verblets-automations/           ← XDG_DATA_HOME
  <automation-name>/
    automation/                                ← automationStorage (persistent across runs)
  domain/                                      ← domainStorage (shared across automations)
  _runs/
    <name>-<ISO-timestamp>/                    ← localStorage (per-run, ephemeral)
```

Keys map to file paths: `get('assessments/filter')` reads `<basePath>/assessments/filter`. Subdirectories are created as needed.

## Runner Module

`src/lib/automation-runner/index.js` exports:
- `discoverAutomations()` — reads registry, validates each entry's `index.js` exports `run`
- `runAutomation(name, params?, options?)` — resolves from registry, loads templates/schemas/modules, constructs RunContext, invokes `run(ctx, enrichedParams)`

The runner enriches params before passing to the automation:
```javascript
const enrichedParams = {
  ...params,                         // user-provided params
  templates: { ...shared, ...own },  // merged text files from data dirs
  schemas,                           // parsed JSON from schemas/ directory
  _modules: modules,                 // imported JS modules from automation dir
};
```

## CLI Entry

```bash
# Run via the runner (primary interface)
node --import ./src/lib/automation-runner/loader.js -e "
  import { runAutomation } from './src/lib/automation-runner/index.js';
  await runAutomation('eventing-quality', { modules: 'filter', capture: false });
"

# With fresh env (when shell has stale API keys)
(unset ANTHROPIC_API_KEY; unset OPENAI_API_KEY; source .env; node --import ./src/lib/automation-runner/loader.js -e "...")
```

## ctx.lib.emit

Plain `createProgressEmitter` result. No ring buffer, no query surface.

Automations needing activity query use their own ring buffer:
```javascript
const buffer = new ctx.lib.verblets.ringBuffer(10_000);
const tee = (event) => { buffer.writeSync(event, { force: true }); originalOnProgress?.(event); };
```
