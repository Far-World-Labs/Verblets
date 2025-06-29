# AI Architectural Expectations

A specialized chain for AI-powered architectural testing and validation. This chain intelligently uses different verblet strategies based on the type of analysis needed:

- **Individual processing** (`eachFile`): Uses `chatgpt` directly for deep file analysis
- **Bulk processing** (`eachDir`): Uses `reduce` chain for efficient batch operations  
- **Coverage analysis**: Uses `score` chain to evaluate compliance thresholds

## Key Features

- **Smart processing strategy**: Automatically chooses between individual and bulk processing
- **Dynamic test titles**: Shows counts of items being tested
- **Fluent context API**: Easy context chaining with `withContext` and `withItemContext`
- **Coverage assertions**: Built-in support for threshold-based coverage testing
- **Early failure support**: Configurable `maxFailures` to stop after N failures

## Usage

```javascript
import { aiArchExpect, eachFile, eachDir, countItems } from './src/chains/ai-arch-expect/index.js';

// Individual file analysis (uses chatgpt)
await aiArchExpect(eachFile('src/**/*.js'))
  .withContext(fileContext('package.json', ['name', 'type']))
  .satisfies('All JavaScript files follow consistent coding patterns');

// Bulk directory analysis (uses reduce chain)
await aiArchExpect(eachDir('src/*'))
  .satisfies('All directory names follow kebab-case convention');

// Coverage testing (uses score chain)
await aiArchExpect(eachDir('src/*/'))
  .withItemContext(dir => dataContext(listDir(dir), 'contents'))
  .assertCoverage('has both index.js and README.md files', 0.8);

// Dynamic test titles
const fileCount = await countItems(eachFile('src/**/*.js'));
it(`should have quality code (${fileCount} files)`, async () => {
  await aiArchExpect(eachFile('src/**/*.js'))
    .satisfies('Code follows quality standards');
});
```

## Context Functions

- `fileContext(path, name?)` - Load file content as context
- `jsonContext(path, fields?, name?)` - Load JSON data, optionally specific fields
- `dataContext(data, name)` - Use arbitrary data as context
- `listDir(path)` - Get directory contents for analysis