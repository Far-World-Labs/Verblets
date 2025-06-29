# AI Architectural Expectations

A specialized chain for AI-powered architectural testing and validation. This chain intelligently uses different verblet strategies based on the type of analysis needed:

- **Individual processing** (`eachFile`): Uses `chatgpt` directly for deep file analysis with parallel processing
- **Bulk processing** (`eachDir`): Uses `reduce` chain for efficient batch operations with parallel chunk processing
- **Coverage analysis**: Uses normal processing mode selection but disables maxFailures to process all items

## Key Features

- **Smart processing strategy**: Automatically chooses between individual and bulk processing
- **Parallel processing**: Both individual and bulk modes use parallel processing for faster execution
- **Dynamic test titles**: Shows counts of items being tested
- **Fluent context API**: Easy context chaining with `withContext` and `withItemContext`
- **Coverage assertions**: Built-in support for threshold-based coverage testing
- **Configurable processing**: Control bulk size and concurrency through config options
- **Early failure support**: Configurable `maxFailures` to stop after N failures (disabled in coverage mode)

## Usage

```javascript
import { aiArchExpect, eachFile, eachDir, countItems } from './src/chains/ai-arch-expect/index.js';

// Basic usage with default settings (bulkSize: 20, maxConcurrency: 5)
await aiArchExpect(eachFile('src/**/*.js'))
  .withContext(fileContext('package.json'))
  .satisfies('All JavaScript files follow consistent coding patterns');

// For specific JSON fields, use dataContext with pre-filtered data
const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packageInfo = { name: packageData.name, type: packageData.type };

await aiArchExpect(eachDir('src/*'), {
  bulkSize: 40,              // Increase bulk size for simple tests
  maxConcurrency: 8,         // Increase concurrent processing
  maxFailures: 3             // Stop after 3 failures
})
  .withContext(dataContext(packageInfo, 'package-info'))
  .satisfies('All directory names follow kebab-case convention');

// Coverage testing (invalidates maxFailures - all items processed)
await aiArchExpect(eachDir('src/*/'), {
  bulkSize: 30,
  maxConcurrency: 6
})
  .withItemContext(dir => dataContext(listDir(dir), 'contents'))
  .coverage(0.8)
  .satisfies('has both index.js and README.md files');

// Dynamic test titles
const fileCount = await countItems(eachFile('src/**/*.js'));
it(`should have quality code (${fileCount} files)`, async () => {
  await aiArchExpect(eachFile('src/**/*.js'), {
    bulkSize: 25,
    maxConcurrency: 10
  })
    .satisfies('Code follows quality standards');
});
```

## Configuration Options

### Constructor Options
- **bulkSize** (number, default: 20): Items per bulk processing chunk. Simple tests (naming, conventions) automatically increase to 40 minimum
- **maxConcurrency** (number, default: 5): Maximum concurrent requests for individual processing and bulk chunk processing
- **maxFailures** (number, default: 1): Stop processing after N failures. Ignored in coverage mode

### Processing Modes
- **Individual Mode**: Activated when using `onChunkProcessed`, `withItemContext`, or ≤5 items
- **Bulk Mode**: Used for larger sets without item-specific context
- **Coverage Mode**: Uses normal processing mode selection but disables maxFailures to process all items

### Parallel Processing
- **Individual Mode**: Processes items in parallel batches of `maxConcurrency` size
- **Bulk Mode**: Processes chunks in parallel, each chunk handled by the reduce chain
- **Metadata**: All chunk callbacks receive processing mode and concurrency configuration in metadata

## Context Functions

- `fileContext(path, name?)` - Load file content as context
- `jsonContext(path, name?)` - Load entire JSON file as context
- `dataContext(data, name)` - Include arbitrary data as context (use this for filtered JSON data)

## Chunk Processing Metadata

When using `onChunkProcessed`, the metadata object includes:
```javascript
{
  chunkIndex: 1,
  totalChunks: 5,
  itemsInChunk: 20,
  totalItems: 100,
  status: 'processing' | 'completed' | 'error',
  passed: 18,           // Only in 'completed' status
  failed: 2,            // Only in 'completed' status
  bulkSize: 20,         // Configuration values passed as metadata
  maxConcurrency: 5,
  processingMode: 'individual' | 'bulk',
  parallelMode: true    // Always true in current implementation
}
```

## Examples

### High-Performance Processing
```javascript
// Process many files with increased concurrency
await aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 40,
  maxConcurrency: 12,
  maxFailures: 5
})
  .satisfies('Files follow naming conventions');
```

### Coverage Testing with Custom Configuration
```javascript
// Coverage mode processes all items regardless of failures
await aiArchExpect(eachDir('src/*/'), {
  bulkSize: 25,
  maxConcurrency: 8
})
  .coverage(0.75)
  .satisfies('Directories have proper documentation');
```

### Progress Monitoring
```javascript
const expectation = aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 30,
  maxConcurrency: 6
});

expectation.onChunkProcessed = (items, error, metadata) => {
  console.log(`[${metadata.processingMode}] ${metadata.chunkIndex}/${metadata.totalChunks} - ` +
              `${metadata.passed || 0}/${metadata.itemsInChunk} passed ` +
              `(parallel: ${metadata.parallelMode}, bulk: ${metadata.bulkSize})`);
};

await expectation.satisfies('Code quality standards').start();
```