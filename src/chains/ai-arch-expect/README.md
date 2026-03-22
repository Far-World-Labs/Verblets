# ai-arch-expect

AI-powered architectural testing. Assert expectations across files and directories using natural language.

## Example

```javascript
import { aiArchExpect } from '@far-world-labs/verblets';
// eachFile, eachDir, countItems are separate lib modules — import them directly

// Verify coding conventions across an entire codebase
await aiArchExpect(eachFile('src/**/*.js'))
  .satisfies('All JavaScript files use named exports, not default exports');

// Check directory structure with coverage threshold
await aiArchExpect(eachDir('src/*/'))
  .withItemContext(dir => dataContext(listDir(dir), 'contents'))
  .coverage(0.8)
  .satisfies('has both index.js and README.md files');

// Dynamic test titles
const fileCount = await countItems(eachFile('src/**/*.js'));
it(`coding standards (${fileCount} files)`, async () => {
  await aiArchExpect(eachFile('src/**/*.js'))
    .satisfies('No console.log statements outside of debug utilities');
});
```

## API

### `aiArchExpect(source, options?)`

- **source**: `eachFile(glob)` or `eachDir(glob)`
- **options**:
  - `bulkSize` (number, default: 20): Items per processing chunk
  - `maxConcurrency` (number, default: 5): Parallel request limit
  - `maxFailures` (number, default: 1): Stop after N failures (disabled in coverage mode)

### Fluent methods

- `.withContext(ctx)` — add shared context (`fileContext`, `jsonContext`, `dataContext`)
- `.withItemContext(fn)` — add per-item context
- `.coverage(threshold)` — assert pass rate >= threshold (processes all items)
- `.satisfies(expectation)` — run the assertion
- `.onChunkProcessed` — progress callback

### Context helpers

- `fileContext(path, name?)` — load file content
- `jsonContext(path, name?)` — load JSON file
- `dataContext(data, name)` — arbitrary data
