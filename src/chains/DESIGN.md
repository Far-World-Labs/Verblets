# Chain Module Guidelines

## What is a Chain?

Chains are AI-powered workflows that handle complex, multi-step processes. They orchestrate multiple LLM calls, manage batch processing, implement retry logic, and coordinate stateful operations that go beyond single verblet capabilities.

**Chains build on verblets** - they use the same core patterns for LLM interaction, schema handling, and structured output. For foundational concepts like schema passing, response handling, and basic LLM configuration, see [Verblet Design Guidelines](../verblets/DESIGN.md).

## Chain vs Verblet

| Aspect | Verblets | Chains |
|--------|----------|--------|
| **Purpose** | Single AI operation | Multi-step AI workflows |
| **Complexity** | Simple, focused functions | Complex orchestration logic |
| **Input** | Individual items or simple data | Arrays, batches, complex datasets |
| **Processing** | Direct LLM calls | Batch processing, retry logic, progress tracking |
| **State** | Stateless operations | Stateful workflows with coordination |
| **Examples** | `sentiment()`, `classify()` | `aiArchExpect()`, `bulkAnalysis()` |

## Module Structure

### Directory Naming
- Use **kebab-case** for directory names (e.g., `pop-reference`, `filter-ambiguous`)
- Keep names descriptive but concise
- Follow existing patterns in the codebase

### Required Files
Each chain directory contains:
- `index.js` - Main implementation
- `index.spec.js` - Unit tests (mock LLM calls)
- `index.examples.js` - Integration examples (real LLM calls)
- `schema.json` - Output schema (when applicable)
- `README.md` - **Required for most chains**, optional only for very simple ones

## Chain-Specific Characteristics

### Model Configuration

- **Use internal default model** - Don't explicitly define model names like `goodCheap`
- Let the system handle model selection through default configuration
- Only specify model options when specific capabilities are needed (e.g., `negotiate: { reasoning: true }`)

### Prompt Engineering Best Practices

- **Parameter ordering** - Put description/instruction parameters higher in the prompt since they're more important for guiding LLM interpretation
- **Content wrapping** - Wrap all caller-supplied content with `asXML()` for lengthy inputs to ensure proper formatting
- **Structured tags** - Include proper XML tags for structured content (e.g., `<sentence>`, `<description>`, `<items>`)
- **Clear sections** - Separate instructions, context, and data clearly in the prompt

Example:
```javascript
const prompt = `Process the following based on the description.

${asXML(description, { tag: 'description' })}

${asXML(sentence, { tag: 'sentence' })}

Requirements:
- Be specific about expectations
- Use the description to guide interpretation

${onlyJSON}`;
```

### Batch Processing Strategies

Chains must decide how to process multiple items efficiently:

```javascript
export async function processItems(items, options = {}) {
  const { 
    batchSize = 5, 
    maxParallel = 3,
    processingMode = 'auto' // 'individual', 'bulk', 'auto'
  } = options;

  // Determine processing strategy
  const shouldProcessIndividually = (
    processingMode === 'individual' || 
    (processingMode === 'auto' && items.length <= INDIVIDUAL_THRESHOLD)
  );

  if (shouldProcessIndividually) {
    return processIndividually(items, options);
  } else {
    return processBulk(items, options);
  }
}
```

### Progress Tracking and Callbacks

Long-running chains should provide progress feedback via `batchTracker`:

```javascript
import { createBatches, parallel, retry, batchTracker } from '../../lib/index.js';

async function myChain(items, options = {}) {
  const { maxParallel = 3, maxAttempts = 3, onProgress, abortSignal, now = new Date(), ...rest } = options;
  const batches = createBatches(items, rest);
  const tracker = batchTracker('my-chain', items.length, { onProgress, now });

  tracker.start(batches.length, maxParallel);

  await parallel(batches, async ({ items, startIndex }) => {
    await retry(() => process(items), {
      label: 'my-chain:batch',
      maxAttempts,
      onProgress: tracker.forBatch(startIndex, items.length),
      abortSignal,
    });
    tracker.batchDone(startIndex, items.length);
  }, { maxParallel });

  tracker.complete();
}
```

Events emitted follow the shape `{ step, event, totalItems, processedItems, ... }` where `event` is one of `'start'`, `'batch:complete'`, or `'complete'`.

### Scoping Progress for Nested Chains

When a chain passes `onProgress` to a nested chain call, use `scopeProgress` to tag events with a `phase` field so consumers can distinguish parent events from nested events:

```javascript
import { scopeProgress } from '../../lib/progress-callback/index.js';

// Phase format: chainName:purpose
const results = await reduce(items, prompt, {
  onProgress: scopeProgress(onProgress, 'reduce:category-discovery'),
});
```

Phases compose recursively with `/` when scoped chains are themselves wrapped by an outer scope:

```js
// Consumer sees: { step: 'reduce', phase: 'group:workflow/reduce:category-discovery', ... }
```

Phase naming convention is `chainName:purpose` — the chain being called plus a short description of its role. This speciates when the same chain is called multiple times (e.g. `reduce:extraction` vs `reduce:refinement`).

### Failure Handling Strategies

Chains need sophisticated error recovery:

```javascript
async function processWithFailureHandling(items, options = {}) {
  const { 
    maxFailures = 5, 
    continueOnFailure = false,
    isCoverageTest = false 
  } = options;
  
  const results = [];
  let failureCount = 0;
  
  for (const item of items) {
    try {
      const result = await processItem(item);
      results.push(result);
    } catch (error) {
      failureCount++;
      
      // Coverage tests process all items regardless of failures
      if (!isCoverageTest && failureCount >= maxFailures && !continueOnFailure) {
        throw new Error(`Too many failures (${failureCount}). Stopping processing.`);
      }
      
      results.push({ error: error.message, item });
    }
  }
  
  return results;
}
```

## Chain-Specific Schema Patterns

### Bulk Processing Schemas

Chains often need schemas that handle arrays of results:

```javascript
const bulkSchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          passed: { type: 'boolean' },
          reason: { type: 'string' },
          metadata: { type: 'object' }
        },
        required: ['path', 'passed', 'reason']
      }
    },
    summary: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        passed: { type: 'number' },
        failed: { type: 'number' }
      }
    }
  },
  required: ['results']
};
```

### Parallel Processing Utility

Chains often need parallel processing capabilities:

```javascript
async function processInParallel(items, processor, concurrency = 3) {
  const results = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}
```

## Expected Exports

```javascript
/**
 * Process items using AI-powered workflow
 * @param {Array} items - Items to process
 * @param {Object} [options] - Configuration options
 * @param {number} [options.batchSize=5] - Items per batch
 * @param {number} [options.maxParallel=3] - Parallel processing limit
 * @param {number} [options.maxAttempts=3] - Retry attempts per LLM call
 * @param {Function} [options.onProgress] - Progress callback
 * @param {AbortSignal} [options.abortSignal] - Signal to cancel the operation
 * @param {string|Object} [options.llm] - LLM configuration
 * @returns {Promise<Array>} Processed results
 */
export async function chainName(items, options = {}) {
  // Implementation
}

export default chainName;
```

## Common Chain Types

- **Analysis Chains**: Multi-step analysis workflows (`aiArchExpect`, `centralTendency`)
- **Transformation Chains**: Bulk data transformation with validation
- **Orchestration Chains**: Coordinate multiple verblets or external services
- **Aggregation Chains**: Collect and summarize results from multiple sources

## Integration Requirements

### Adding New Chains
1. Add entry to `src/index.js` exports
2. Add entry to main `README.md` under appropriate category
3. Follow the established export pattern for both named and verblets exports

### Testing Integration
- Import as: `import expect from '../expect/index.js';`
- Use pattern: `await expect(actual).toSatisfy(constraint)`

## Chain-Specific Documentation Requirements

**README Always Required For:**
- Batch processing strategies and configuration
- Progress tracking and callback patterns
- Complex failure handling logic
- Multi-step workflows with dependencies
- Performance considerations for large datasets
- Avoid generic feature lists (bulk processing, retries, etc.)

**README Structure:**
```markdown
# Chain Name

Brief description of the multi-step workflow.

## Usage

\`\`\`javascript
import { chainName } from '@far-world-labs/verblets';

const results = await chainName(items, {
  batchSize: 10,
  processingMode: 'bulk',
  onProgress: (event) => console.log(`${event.step} ${event.event} ${event.processedItems}/${event.totalItems}`)
});
\`\`\`

## Processing Modes
- `individual` - Process items one by one
- `bulk` - Process items in batches
- `auto` - Choose based on dataset size

## Configuration Options
[Detailed parameter documentation]

## Performance Notes
[Guidance on batch sizes, concurrency, memory usage]
```

## Chain-Specific Testing Patterns

**Unit Tests should cover:**
- Different processing modes (individual vs bulk)
- Failure handling and recovery scenarios
- Progress tracking and callback functionality
- Batch size and concurrency configurations

**Integration Tests should validate:**
- End-to-end workflows with real data
- Performance characteristics with various dataset sizes
- Memory usage patterns for large batches

## Performance Considerations

### Memory Management
```javascript
// Process large datasets in chunks to avoid memory issues
async function processLargeDataset(items, options = {}) {
  const { batchSize = 100 } = options;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await processChunk(chunk, options);
    results.push(...chunkResults);
    
    // Optional: Clear intermediate results to free memory
    if (options.clearIntermediateResults) {
      // Cleanup logic
    }
  }
  
  return results;
}
```

### Rate Limiting and API Quotas
```javascript
// Handle API rate limits gracefully
async function processWithRateLimit(items, options = {}) {
  const { requestsPerMinute = 60 } = options;
  const delayBetweenRequests = 60000 / requestsPerMinute;
  
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);
    
    // Throttle requests to respect rate limits
    if (results.length < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }
  
  return results;
}
```

## Quality Patterns

- **Configurable Processing**: Support multiple processing strategies
- **Graceful Degradation**: Handle partial failures appropriately
- **Resource Management**: Respect memory limits and API quotas
- **Observability**: Provide progress tracking and detailed error reporting
- **Composability**: Allow chains to call other chains or verblets

## Anti-Patterns

- Hard-coded processing strategies without configuration options
- Poor error messages that don't indicate which items failed
- Memory leaks from processing large datasets without chunking
- Missing progress feedback for long-running operations
- Inconsistent failure handling across different processing modes
- Not leveraging verblet patterns for individual item processing 