# Architecture Testing System

Architecture tests (`*.arch.js`) use AI-powered analysis and fast dependency tools to verify code quality, organization, and adherence to design principles across the codebase.

## Core Tools

### aiArchExpect

The primary tool for content-level analysis. It fans files or directories through an LLM in configurable batches.

```javascript
import aiArchExpect, { fileContext } from './src/chains/ai-arch-expect/index.js';

await aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 25,
  maxConcurrency: 8,
  maxFailures: 3,
})
  .withContext(fileContext('.claude/guidelines/CODE_QUALITY.md'))
  .satisfies('File follows code quality standards')
  .start();
```

**Configuration:**
- `bulkSize` (default: 20) — items per processing chunk
- `maxConcurrency` (default: 5) — parallel requests
- `maxFailures` (default: 1) — stop after N failures (ignored in coverage mode)

**Key methods:**
- `.withContext(ctx)` — add guidelines or reference files (`fileContext`, `jsonContext`, `dataContext`)
- `.withItemContext(fn)` — per-item context (e.g., loading each module's README alongside its code)
- `.satisfies(description)` — what to test for
- `.coverage(threshold)` — percentage mode, processes all items regardless of failures
- `.start()` — execute

### eachFile / eachDir

Target selectors using glob patterns:

```javascript
import eachFile from './src/lib/each-file/index.js';
import eachDir from './src/lib/each-dir/index.js';

eachFile('src/**/index.js')
eachDir('src/{chains,verblets,lib}/*')
```

### Dependency Cruiser

Fast, deterministic structural checks — circular dependencies, import boundaries, module isolation:

```javascript
import { runDCRule } from './src/lib/dependency-cruiser/index.js';

await runDCRule({
  name: 'no-circular',
  severity: 'error',
  from: {},
  to: { circular: true },
});

await runDCRule({
  name: 'verblets-no-chains',
  severity: 'error',
  from: { path: '^src/verblets/' },
  to: { path: '^src/chains/' },
});
```

Use dependency cruiser for anything structural (imports, cycles, boundaries). Reserve AI analysis for content quality, naming conventions, and documentation.

## Coverage Mode

Instead of all-or-nothing, test what percentage of the codebase meets a standard:

```javascript
await aiArchExpect(eachDir('src/*/'), { bulkSize: 30, maxConcurrency: 8 })
  .coverage(0.75)
  .satisfies('Directory has appropriate documentation')
  .start();
```

Coverage mode disables `maxFailures` and processes every item to calculate a pass/fail ratio.

## Progress and Timeouts

For long-running tests, attach a progress callback and wrap with an inactivity timeout:

```javascript
import { withInactivityTimeout } from './src/lib/with-inactivity-timeout/index.js';

await withInactivityTimeout(async (onUpdate) => {
  const expectation = aiArchExpect(eachFile('src/**/*.js'), {
    bulkSize: 25,
    maxConcurrency: 8,
  });

  expectation.onChunkProcessed = (items, error, metadata) => {
    console.log(`[${metadata.processingMode}] ${metadata.chunkIndex}/${metadata.totalChunks}`);
    onUpdate(items, error);
  };

  return await expectation.satisfies('Code quality standards').start();
}, 10000);
```

## Debugging

Batch processing output is silent by default. Enable it with `VERBLETS_ARCH_LOG=debug`:

```bash
VERBLETS_ARCH_LOG=debug npm run arch
```

Output shows chunk progress, pass/fail status, timing, and failure reasons:

```
[doc-coverage 1/3] PASS: [src/lib/llm, src/lib/each-file]
[doc-coverage 2/3] FAIL (15.2s): [src/lib/strip-response] - Missing README
[quality 1/8] PASS (12.4s): [src/chains/reduce/index.js, src/chains/map/index.js]
```

## Performance Tuning

Simple checks (naming conventions) handle larger batches and higher concurrency. Complex analysis (detailed code quality) needs smaller batches. Adjust `bulkSize` and `maxConcurrency` accordingly — there's no single right setting.

Processing modes:
- **Individual** — parallel batches of single-item analysis
- **Bulk** — parallel chunks processed by the reduce chain
- **Coverage** — individual processing, all items analyzed
