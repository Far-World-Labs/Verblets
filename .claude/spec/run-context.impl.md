# RunContext — Implementation Details

## Module Location

`src/lib/run-context/index.js` — exports `RunContext` class.

Supporting modules in the same directory:
- `data-store.js` — `createDataStore(basePath)` for storage domains
- `file-ops.js` — `createFileOps(rootDir)` for ctx.lib.scripts.files
- `emit.js` — `createEmit(name, options)` for ctx.lib.emit
- `exec.js` — `createExec(options)` for ctx.lib.scripts.exec
- `media-encoding.js` — `createMediaEncoding(store)` for ctx.lib.scripts.mediaEncoding

## RunContext Construction

The runner constructs RunContext — automations never construct it directly:

```javascript
// In automation-runner/index.js:
const ctx = new RunContext(name, {
  automationDir,                    // path to automation code directory
  projectRoot: projectRoot || process.cwd(),
  onProgress,                       // optional external listener
  initOptions,
  params: enrichedParams,
});
```

Construction sequence:
1. Resolve XDG paths for storage domains
2. Create storage domains (filesystem-backed)
3. Populate `ctx.localStorage` with `ENV` and `self`
4. Create `ctx.lib.emit` (plain progress emitter)
5. Create `ctx.lib.scripts.files` (fs/promises wrapper)
6. Create `ctx.lib.scripts.exec` (automation-to-automation via registry)
7. Set `ctx.lib.verblets` to `import * as verblets from '../../shared.js'`
8. Attach Node-only utilities to `ctx.lib.scripts`

## Storage Paths

```javascript
const xdgData = process.env.XDG_DATA_HOME || resolve(homedir(), '.local', 'share');
const appData = resolve(xdgData, 'verblets-automations');
const runId = `${automationName}-${new Date().toISOString().replace(/[:.]/g, '-')}`;

localStorage      → appData/_runs/<runId>/
automationStorage → appData/<name>/automation/
domainStorage     → appData/domain/
```

## Data Store Implementation

`createDataStore(basePath)` returns the storage API backed by local filesystem.

Key-to-path mapping: `key` is used as a relative path under `basePath`. `/` in keys creates subdirectories. Characters unsafe for filenames are percent-encoded.

## File Ops Implementation

`createFileOps(rootDir)` wraps `node:fs/promises`. All paths resolve relative to `rootDir` (the project root passed to the runner).

## Emit Implementation

`createEmit(name, options)` returns a plain `createProgressEmitter(name, onProgress)` result. No ring buffer, no query surface.

Automations needing activity query create their own:
```javascript
const buffer = new ctx.lib.verblets.ringBuffer(10_000);
```

## Exec Implementation

`createExec(options)` returns `{ automation(name, params?) }`.

Resolution uses the XDG-backed automation registry:
```javascript
async function automation(name, params = {}) {
  const automationDir = await resolveAutomation(name);
  const childCtx = buildChildContext(name, automationDir);
  const mod = await import(pathToFileURL(resolve(automationDir, 'index.js')).href);
  const run = mod.run || mod.default?.run;
  return run(childCtx, params);
}
```

## ctx.lib.verblets

`import * as verblets from '../../shared.js'` — the entire isomorphic library surface. Not a curated subset.

## ctx.lib.scripts

Node.js-dependent utilities, not suitable for browser:

```javascript
scripts: {
  files,              // createFileOps(projectRoot)
  exec,               // createExec({ emit, buildChildContext })
  mediaEncoding,      // createMediaEncoding(automationStorage)
  webScrape,          // web-scrape chain
  siteCrawl,          // site-crawl chain
  tileImages,         // from image-utils
  imageToBase64,      // from image-utils
  resizeImage,        // from image-utils
  createTempDir,      // from temp-files
  resolveOutputDir,   // from temp-files
  process: { exit },  // explicit termination
}
```
