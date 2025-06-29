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

Each chain directory contains:
- `index.js` - Main implementation
- `index.spec.js` - Unit tests (mock LLM calls)
- `index.examples.js` - Integration examples (real LLM calls)
- `schema.json` - Output schema (when applicable)
- `README.md` - **Required for most chains**, optional only for very simple ones

## Chain-Specific Characteristics

### Batch Processing Strategies

Chains must decide how to process multiple items efficiently:

```javascript
export async function processItems(items, options = {}) {
  const { 
    batchSize = 5, 
    maxConcurrency = 3,
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

Long-running chains should provide progress feedback:

```javascript
async function processIndividually(items, options = {}) {
  const { onProgress, onItemComplete } = options;
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    const result = await processItem(items[i]);
    results.push(result);
    
    onItemComplete?.(result, i, items.length);
    onProgress?.(i + 1, items.length);
  }
  
  return results;
}
```

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
 * @param {number} [options.maxConcurrency=3] - Parallel processing limit
 * @param {string} [options.processingMode='auto'] - 'individual'|'bulk'|'auto'
 * @param {number} [options.maxFailures=5] - Maximum allowed failures
 * @param {Function} [options.onProgress] - Progress callback
 * @param {Object} [options.llm] - LLM configuration
 * @returns {Promise<Array>} Processed results
 */
export async function chainName(items, options = {}) {
  // Implementation
}

export default chainName;
```

## Common Chain Types

- **Analysis Chains**: Multi-step analysis workflows (`aiArchExpect`, `codeQuality`)
- **Transformation Chains**: Bulk data transformation with validation
- **Orchestration Chains**: Coordinate multiple verblets or external services
- **Aggregation Chains**: Collect and summarize results from multiple sources

## Chain-Specific Documentation Requirements

**README Always Required For:**
- Batch processing strategies and configuration
- Progress tracking and callback patterns
- Complex failure handling logic
- Multi-step workflows with dependencies
- Performance considerations for large datasets

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
  onProgress: (current, total) => console.log(`${current}/${total}`)
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
  const { chunkSize = 100 } = options;
  const results = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
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