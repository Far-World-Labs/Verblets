# each-file

Create target specifications for files matching glob patterns, primarily used with architecture testing.

## Usage

```javascript
import eachFile from './each-file/index.js';

// Create target specification for JavaScript files
const jsFiles = eachFile('src/**/*.js');

// Create target specification for test files
const testFiles = eachFile('src/**/*.spec.js');

// Create target specification for specific file types
const readmeFiles = eachFile('**/README.md');
```

## Parameters

- **`pattern`** (string, required): Glob pattern to match files
  - Supports standard glob syntax (`*`, `**`, `?`, `[]`)
  - Only matches files, not directories
  - Relative to current working directory

## Return Value

Returns a target specification object with:
- **`type`** (string): Always `'files'`
- **`pattern`** (string): The original glob pattern
- **`resolve()`** (async function): Resolves to array of matching file paths

## Features

- **Glob Pattern Support**: Full glob syntax support for flexible file matching
- **File-Only Matching**: Automatically filters out directories
- **Async Resolution**: Non-blocking file system operations
- **Architecture Testing**: Designed for use with `aiArchExpect` and testing frameworks

## Use Cases

### Architecture Testing
```javascript
import { aiArchExpect } from '../ai-arch-expect/index.js';
import eachFile from './each-file/index.js';

// Test all JavaScript files for coding standards
await aiArchExpect(
  eachFile('src/**/*.js'),
  'should follow ES6 module syntax and have proper JSDoc comments'
);

// Test README files for documentation standards
await aiArchExpect(
  eachFile('**/README.md'),
  'should have clear title, usage examples, and API documentation'
);
```

### Code Quality Auditing
```javascript
import eachFile from './each-file/index.js';

// Audit all source files
const sourceFiles = eachFile('src/**/*.{js,ts,jsx,tsx}');
const files = await sourceFiles.resolve();

console.log(`Found ${files.length} source files to audit`);
files.forEach(file => console.log(`- ${file}`));
```

### Documentation Generation
```javascript
import eachFile from './each-file/index.js';

// Find all API files for documentation
const apiFiles = eachFile('src/api/**/*.js');
const docFiles = eachFile('docs/**/*.md');

// Generate documentation index
async function generateDocIndex() {
  const apis = await apiFiles.resolve();
  const docs = await docFiles.resolve();
  
  return {
    apiModules: apis.length,
    documentationFiles: docs.length,
    coverage: docs.length / apis.length
  };
}
```

### Build Tool Integration
```javascript
import eachFile from './each-file/index.js';

// Find all files that need processing
const sourceFiles = eachFile('src/**/*.js');
const styleFiles = eachFile('src/**/*.css');

async function buildPipeline() {
  const [jsFiles, cssFiles] = await Promise.all([
    sourceFiles.resolve(),
    styleFiles.resolve()
  ]);
  
  // Process files in build pipeline
  await processJavaScript(jsFiles);
  await processStyles(cssFiles);
}
```

## Advanced Usage

### Complex Glob Patterns
```javascript
// Match specific file types in specific directories
const complexPattern = eachFile('src/{components,utils}/**/*.{js,ts}');

// Exclude certain patterns
const excludeTests = eachFile('src/**/*.js');
// Note: Use negative patterns in glob for exclusions
const withoutTests = eachFile('src/**/!(*.spec|*.test).js');

// Match files with specific naming conventions
const kebabCase = eachFile('src/**/*-*.js');
const camelCase = eachFile('src/**/*[A-Z]*.js');
```

### Batch Processing
```javascript
import eachFile from './each-file/index.js';

async function processFilesBatch(patterns, processor) {
  const targets = patterns.map(pattern => eachFile(pattern));
  const fileLists = await Promise.all(
    targets.map(target => target.resolve())
  );
  
  const allFiles = fileLists.flat();
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
  }
}

// Usage
await processFilesBatch(
  ['src/**/*.js', 'test/**/*.js'],
  async (file) => {
    console.log(`Processing ${file}`);
    // Process individual file
  }
);
```

### Custom File Filtering
```javascript
import eachFile from './each-file/index.js';

async function getFilteredFiles(pattern, filterFn) {
  const target = eachFile(pattern);
  const allFiles = await target.resolve();
  return allFiles.filter(filterFn);
}

// Get only recently modified files
const recentFiles = await getFilteredFiles('src/**/*.js', file => {
  const stats = fs.statSync(file);
  const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return stats.mtime.getTime() > dayAgo;
});
```

## Integration Patterns

### With Testing Frameworks
```javascript
import { describe, it } from 'vitest';
import eachFile from './each-file/index.js';

describe('Code Quality Tests', () => {
  it('should test all source files', async () => {
    const sourceFiles = eachFile('src/**/*.js');
    const files = await sourceFiles.resolve();
    
    expect(files.length).toBeGreaterThan(0);
    
    for (const file of files) {
      // Individual file tests
      await testFileQuality(file);
    }
  });
});
```

### With Build Systems
```javascript
import eachFile from './each-file/index.js';

export default {
  name: 'file-processor',
  setup(build) {
    build.onStart(async () => {
      const files = eachFile('src/**/*.js');
      const resolved = await files.resolve();
      
      console.log(`Processing ${resolved.length} files...`);
      return { files: resolved };
    });
  }
};
```

### With Code Analysis Tools
```javascript
import eachFile from './each-file/index.js';
import ESLint from 'eslint';

async function lintProject() {
  const eslint = new ESLint();
  const target = eachFile('src/**/*.js');
  const files = await target.resolve();
  
  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter('stylish');
  const resultText = formatter.format(results);
  
  console.log(resultText);
}
```

## Related Modules

- [`glob`](https://www.npmjs.com/package/glob) - Underlying glob pattern matching library
- [`ai-arch-expect`](../ai-arch-expect/README.md) - Architecture testing with AI analysis
- [`search-js-files`](../search-js-files/README.md) - Search for patterns within JavaScript files

## Error Handling

```javascript
try {
  const target = eachFile('src/**/*.js');
  const files = await target.resolve();
  
  if (files.length === 0) {
    console.log('No files found matching pattern');
  }
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('Directory not found');
  } else if (error.message.includes('Invalid glob pattern')) {
    console.log('Glob pattern syntax error');
  } else {
    console.log('File resolution failed:', error.message);
  }
}
```

## Performance Considerations

- **Pattern Specificity**: More specific patterns reduce file system traversal time
- **Batch Processing**: Process files in batches to avoid memory issues with large file sets
- **Caching**: Consider caching resolved file lists for repeated operations
- **Exclusion Patterns**: Use negative glob patterns to exclude unnecessary directories like `node_modules` 