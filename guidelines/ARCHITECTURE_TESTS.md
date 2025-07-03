# Architecture Testing System

The Verblets library uses a sophisticated architecture testing system that combines AI-powered analysis with fast dependency analysis tools to ensure code quality, proper organization, and adherence to design principles.

## Philosophy

Our architecture tests are **real-world tests** that:
- **Never mock LLM calls** - We test against actual AI responses to ensure reliability
- **Use real dependency analysis** - We analyze actual import relationships, not simulated ones
- **Focus on practical outcomes** - Tests verify what actually matters for maintainability and usability

## Core Components

### `aiArchExpect` - AI-Powered Architecture Analysis

The primary tool for testing code structure and quality using LLM reasoning with parallel processing.

```javascript
import aiArchExpect, { fileContext } from './src/chains/ai-arch-expect/index.js';

await aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 25,
  maxConcurrency: 8,
  maxFailures: 3
})
  .withContext(fileContext('guidelines/CODE_QUALITY.md'))
  .satisfies('File follows code quality standards')
  .start();
```

**Configuration Options:**
- **bulkSize** (default: 20) - Items per bulk processing chunk
- **maxConcurrency** (default: 5) - Concurrent requests for faster processing  
- **maxFailures** (default: 1) - Stop after N failures (ignored in coverage mode)

**Key Methods:**
- `.withContext(context)` - Add guidelines, examples, or reference files
- `.withItemContext(fn)` - Add per-item context (like README files)
- `.satisfies(description)` - Define what to test for
- `.coverage(threshold)` - Test coverage percentage, processes all items
- `.start()` - Execute the test

### `eachFile` and `eachDir` - Target Selectors

Utilities for selecting files and directories to test:

```javascript
import eachFile from './src/lib/each-file/index.js';
import eachDir from './src/lib/each-dir/index.js';

// Test all JavaScript files
eachFile('src/**/*.js')

// Test specific directories
eachDir('src/{chains,verblets,lib}/*')

// Test index files only
eachFile('src/**/index.js')
```

### Context Providers

Add relevant information to guide AI analysis:

```javascript
import { fileContext, jsonContext, dataContext } from './src/chains/ai-arch-expect/index.js';

// Instead of filtering fields in jsonContext, use dataContext with specific data
const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const relevantPackageInfo = {
  name: packageData.name,
  type: packageData.type,
  dependencies: packageData.dependencies
};

await aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 25,
  maxConcurrency: 8,
  maxFailures: 3
})
  .withContext(dataContext(relevantPackageInfo, 'package-info'))
  .satisfies('File follows code quality standards')
  .start();
```

### Progress Monitoring and Timeouts

Architecture tests provide detailed progress reporting and timeout handling:

```javascript
import { withInactivityTimeout } from './src/lib/with-inactivity-timeout/index.js';

await withInactivityTimeout(
  async (onUpdate) => {
    const expectation = aiArchExpect(eachFile('src/**/*.js'), {
      bulkSize: 30,
      maxConcurrency: 6
    });
    
    expectation.onChunkProcessed = (items, error, metadata) => {
      console.log(`[${metadata.processingMode}] ${metadata.chunkIndex}/${metadata.totalChunks} - ` +
                  `${metadata.passed || 0}/${metadata.itemsInChunk} passed`);
      onUpdate(items, error);
    };
    
    return await expectation.satisfies('Code quality standards').start();
  },
  10000 // 10 second inactivity timeout
);
```

**Progress Metadata:**
- Provides progress feedback during long operations
- Prevents tests from hanging indefinitely
- Allows graceful handling of timeouts
- Includes processing mode and configuration details

### Dependency Cruiser Integration

Fast, accurate dependency analysis using the `dependency-cruiser` library:

```javascript
import { runDCRule } from './src/lib/dependency-cruiser/index.js';

// Check for circular dependencies
await runDCRule({
  name: 'no-circular',
  severity: 'error',
  from: {},
  to: { circular: true }
});

// Enforce import restrictions
await runDCRule({
  name: 'verblets-no-chains',
  severity: 'error',
  from: { path: '^src/verblets/' },
  to: { path: '^src/chains/' }
});
```

**Benefits:**
- **Speed** - Milliseconds vs. seconds for LLM analysis
- **Accuracy** - No false positives from AI interpretation
- **Deterministic** - Same results every time

## Test Categories

### Fast Structural Tests (Dependency Cruiser)
- Circular dependency detection
- Import restriction enforcement
- Module boundary validation

### Slow Content Tests (AI-Powered)
- Code quality analysis
- Documentation quality
- Naming conventions
- Test file structure

### Coverage Tests
Instead of all-or-nothing, test what percentage meets standards:

```javascript
await aiArchExpect(eachDir('src/*/'), {
  bulkSize: 30,
  maxConcurrency: 8
})
  .coverage(0.75) // 75% threshold - processes all items
  .satisfies('Directory has appropriate documentation')
  .start();
```

**Coverage Mode Behavior:**
- Disables maxFailures to process all items
- Uses normal processing mode selection (individual or bulk)
- Calculates pass/fail ratio against threshold

## Debugging Batch Output

Architecture tests can produce verbose batch processing output to help track progress on long-running tests. This debugging output is disabled by default to keep test output clean.

### Enable Debugging for All Tests

Set the environment variable when running tests:

```bash
# Enable debugging for all architecture tests
ARCH_LOG=debug npm run arch

# Or for specific test files
ARCH_LOG=debug npx vitest index.arch.js
```

### Enable Debugging for Individual Tests

Use Vitest spies to override the `ARCH_LOG` constant within specific tests:

```javascript
import { vi } from 'vitest';
import { ARCH_LOG } from './src/constants/arch.js';

test('my specific test with debugging', async () => {
  const logSpy = vi.spyOn(process.env, 'ARCH_LOG', 'get').mockReturnValue('debug');
  
  await aiArchExpect(eachFile('src/**/*.js'))
    .satisfies('Files meet quality standards')
    .start();
  
  logSpy.mockRestore();
});
```

### Enable Debugging for Test Groups

Use `beforeEach` and `afterEach` hooks with spies to enable debugging for entire test suites:

```javascript
import { vi } from 'vitest';

describe('my test suite with debugging', () => {
  let logSpy;
  
  beforeEach(() => {
    logSpy = vi.spyOn(process.env, 'ARCH_LOG', 'get').mockReturnValue('debug');
  });
  
  afterEach(() => {
    logSpy.mockRestore();
  });
  
  // All tests in this suite will show batch debugging output
  test('first test', async () => { /* ... */ });
  test('second test', async () => { /* ... */ });
});
```

### Debugging Output Format

When enabled, batch debugging shows progress for each chunk:

```
[doc-coverage 1/3] PASS: [src/lib/chatgpt, src/lib/each-file]
[doc-coverage 2/3] FAIL (15.2s): [src/lib/strip-response] - Missing README documentation
[quality 1/8] PASS (12.4s): [src/chains/reduce/index.js, src/chains/map/index.js]
```

The format includes:
- **Test type**: `doc-coverage`, `quality`, `readme`, etc.
- **Progress**: `chunk/total` (e.g., `2/3`)
- **Status**: `PASS` or `FAIL`
- **Timing**: Elapsed seconds for the chunk
- **Items**: List of files/directories processed
- **Error**: Failure reason (if applicable)

## Performance Considerations

### Bulk Processing Configuration
Configure batch sizes and parallelism based on test complexity:

```javascript
// Simple tests can handle larger batches and more concurrency
await aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 40,           // For naming conventions
  maxConcurrency: 12      // Higher concurrency for simple tests
})

// Complex analysis needs smaller batches
await aiArchExpect(eachFile('src/**/*.js'), {
  bulkSize: 15,          // For detailed code quality checks  
  maxConcurrency: 5      // Conservative concurrency
})
```

### Processing Modes
- **Individual Mode**: Parallel batches of individual item analysis
- **Bulk Mode**: Parallel chunks processed by reduce chain
- **Coverage Mode**: Individual processing, all items analyzed

### Progress Reporting
Long-running tests provide detailed progress with processing metadata:

```javascript
expectation.onChunkProcessed = (items, error, metadata) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const status = error ? 'FAIL' : 'PASS';
  console.log(`[${metadata.processingMode}] ${status} ${metadata.chunkIndex}/${metadata.totalChunks} ` +
              `(${elapsed}s, bulk: ${metadata.bulkSize}, concurrency: ${metadata.maxConcurrency})`);
};
```

### Failure Management
- **maxFailures**: Stop after N failures to prevent runaway tests
- **Coverage mode**: Ignores maxFailures, processes all items
- **Early termination**: Prevents wasted processing on widespread issues

## Best Practices

### 1. Use the Right Tool
- **Dependency Cruiser** for structural/import analysis
- **AI Analysis** for content quality and conventions

### 2. Configure Appropriately
- Set reasonable bulk sizes and concurrency for performance
- Use coverage thresholds for gradual improvement
- Set failure limits to prevent runaway tests
- Increase concurrency for simple tests, reduce for complex analysis

### 3. Provide Good Context
- Include relevant guidelines and design documents
- Use specific, actionable descriptions
- Add examples when helpful

### 4. Monitor Performance
- Track test execution times using progress callbacks
- Adjust bulk sizes and concurrency based on complexity
- Use inactivity timeouts for reliability

## Example Test Structure

```javascript
test('should have high-quality code', async () => {
  const startTime = Date.now();
  
  await withInactivityTimeout(
    async (onUpdate) => {
      const expectation = aiArchExpect(eachFile('src/**/*.js'), {
        bulkSize: 25,
        maxConcurrency: 8,
        maxFailures: 5
      })
        .withContext(fileContext('guidelines/CODE_QUALITY.md'))
        .satisfies('File follows code quality standards based on its type and purpose');
      
      expectation.onChunkProcessed = (items, error, metadata) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const status = error ? 'FAIL' : 'PASS';
        console.log(`[quality ${metadata.processingMode}] ${status} ${metadata.chunkIndex}/${metadata.totalChunks} ` +
                    `(${elapsed}s, ${metadata.passed || 0}/${metadata.itemsInChunk})`);
        onUpdate(items, error);
      };
      
      return await expectation.start();
    },
    10000
  );
}, 600000); // 10 minute timeout
```

This system provides comprehensive architecture validation while maintaining reasonable performance and clear feedback about what's being tested and why. 