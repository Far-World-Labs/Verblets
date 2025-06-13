# Ring Buffer

A memory-efficient circular buffer designed for high-throughput logging, batch processing, and LLM operations. Automatically evicts oldest entries when full, making it ideal for streaming data scenarios where memory efficiency is critical.

## Features

- **Automatic Memory Management**: Configurable size limits with automatic eviction of oldest entries
- **Multiple Cursor Support**: Track multiple processing positions concurrently
- **Batch Operations**: Optimized for LLM workflows with parallel and sequential processing
- **Flexible Access Patterns**: ID-based, index-based, and time-based slicing
- **Rich Query Interface**: Filter, find, map, and reduce operations
- **Iterator Support**: Works with for...of loops and spread operator
- **Statistics Tracking**: Monitor buffer usage and performance metrics

## Basic Usage

```javascript
import RingBuffer from '../lib/ring-buffer/index.js';

// Create buffer with capacity of 1000 entries
const buffer = new RingBuffer(1000);

// Add entries
const entry1 = buffer.push('Hello world');
const entry2 = buffer.push({ user: 'alice', action: 'login' });

// Get all entries
const allEntries = buffer.all();
console.log(`Buffer contains ${allEntries.length} entries`);

// Add metadata
const meta = new Map([['source', 'api'], ['priority', 'high']]);
buffer.push('Important message', meta);
```

## Batch Operations

Perfect for processing large datasets in manageable chunks:

```javascript
// Add multiple entries at once
const logData = ['error 1', 'error 2', 'error 3'];
const entries = buffer.pushBatch(logData);

// Process in batches
await buffer.processBatches(50, async (batch, batchIndex) => {
  console.log(`Processing batch ${batchIndex} with ${batch.length} entries`);
  
  // Your processing logic here
  const results = await processLogBatch(batch);
  return results;
});

// Parallel processing for better performance
await buffer.processBatches(25, processBatch, { parallel: true });
```

## Cursor Operations

Track multiple processing positions for concurrent operations:

```javascript
// Create cursors for different processors
buffer.setCursor('error-processor', 0);
buffer.setCursor('audit-processor', 0);
buffer.setCursor('analytics-processor', 0);

// Process new entries since last cursor position
const newErrors = buffer.getSinceCursor('error-processor');
console.log(`Found ${newErrors.length} new entries to process`);

// Cursor automatically moves to latest processed position
// Or control cursor movement manually
const entries = buffer.getSinceCursor('audit-processor', false); // Don't move cursor
```

## Flexible Querying

Rich query interface for finding and analyzing data:

```javascript
// Find entries matching criteria
const errors = buffer.filter(entry => 
  typeof entry.data === 'string' && entry.data.includes('ERROR')
);

// Find first match
const criticalError = buffer.find(entry => 
  entry.meta.get('priority') === 'critical'
);

// Transform data
const timestamps = buffer.map(entry => entry.timestamp);

// Aggregate data
const totalSize = buffer.reduce((sum, entry) => 
  sum + JSON.stringify(entry.data).length, 0
);
```

## Slicing Operations

Access data using different strategies:

```javascript
// Get entries by ID range
const recentEntries = buffer.slice(1000, 1100);

// Get entries by index (like Array.slice)
const firstTen = buffer.sliceByIndex(0, 10);
const lastTen = buffer.tail(10);

// Get entries by time range
const lastHour = new Date(Date.now() - 3600000);
const recentLogs = buffer.sliceByTime(lastHour);
```

## Memory Management

Automatic memory management with detailed statistics:

```javascript
// Check buffer status
console.log(`Buffer is ${buffer.isFull() ? 'full' : 'not full'}`);
console.log(`Current size: ${buffer.size()}/${buffer.capacity()}`);

// Get detailed statistics
const stats = buffer.getStats();
console.log(`Total added: ${stats.totalAdded}`);
console.log(`Total evicted: ${stats.totalEvicted}`);
console.log(`Active cursors: ${stats.cursors}`);

// Clear buffer when needed
buffer.clear(); // Removes all entries and cursors
buffer.clear(true); // Keeps cursors, removes entries
```

## LLM Chain Integration

Designed specifically for LLM workflows:

```javascript
// Log processing pipeline
const logBuffer = new RingBuffer(5000);

// Add logs from various sources
logBuffer.push('User query: "What is the weather?"');
logBuffer.push({ type: 'llm-request', model: 'gpt-4', tokens: 150 });
logBuffer.push('LLM response: "The weather is sunny..."');

// Process logs in batches for LLM analysis
await logBuffer.processBatches(100, async (batch) => {
  // Send batch to LLM for analysis
  const analysis = await analyzeLogs(batch);
  return analysis;
});

// Track different processing stages
logBuffer.setCursor('preprocessing', 0);
logBuffer.setCursor('llm-analysis', 0);
logBuffer.setCursor('postprocessing', 0);

// Each stage processes from its cursor position
const toPreprocess = logBuffer.getSinceCursor('preprocessing');
const toAnalyze = logBuffer.getSinceCursor('llm-analysis');
```

## Advanced Features

### Iterator Support

```javascript
// Use with for...of loops
for (const entry of buffer) {
  console.log(`Entry ${entry.id}: ${entry.data}`);
}

// Use with spread operator
const allEntries = [...buffer];
```

### Filtered Buffers

```javascript
// Create new buffer with filtered data
const errorBuffer = buffer.createFiltered(
  entry => entry.data.includes('ERROR'),
  500 // New buffer capacity
);
```

### Cursor Metadata

```javascript
const cursor = buffer.setCursor('processor-1');
cursor.meta.set('owner', 'error-handler');
cursor.meta.set('last-processed', new Date());
```

## Performance Characteristics

- **Memory**: O(n) where n is buffer capacity (not total entries added)
- **Push**: O(1) amortized
- **Slice by ID**: O(n) where n is buffer size
- **Slice by Index**: O(k) where k is slice size
- **Cursor Operations**: O(1) for cursor management, O(n) for getSinceCursor

## Use Cases

- **High-throughput Logging**: Capture logs without memory leaks
- **LLM Chain Processing**: Batch operations on conversation history
- **Stream Processing**: Process data streams with multiple consumers
- **Audit Trails**: Maintain recent activity with automatic cleanup
- **Performance Monitoring**: Track metrics with bounded memory usage
- **Event Sourcing**: Store recent events with cursor-based replay

The ring buffer is particularly valuable in LLM applications where you need to maintain context windows, process conversation history in batches, or implement streaming responses with memory constraints. 

## Stable Batch Processing

The ring buffer provides advanced stable batch processing capabilities that maintain consistent batch boundaries even when the buffer window changes due to eviction. This is essential for reliable retry scenarios and parallel processing.

### Key Features

- **Globally Stable Batches**: Batch definitions based on entry IDs (not indices) remain consistent
- **Cursor-Based Iteration**: Multiple cursors can iterate over identical batch boundaries
- **Built-in Retry Logic**: Configurable retry with exponential backoff
- **Parallel Processing**: Process batches concurrently while maintaining stability
- **Resume Capability**: Resume processing from exact batch boundaries after interruption

### Basic Stable Batch Processing

```javascript
const buffer = new RingBuffer(1000);

// Add data
for (let i = 1; i <= 100; i++) {
  buffer.push({ id: i, data: `item-${i}` });
}

// Process in stable batches with retry
const results = await buffer.processStableBatches(10, async (entries, batchDef, context) => {
  console.log(`Processing ${batchDef.batchId}: ${entries.length} entries`);
  
  // Your processing logic here
  return entries.map(entry => entry.data.toUpperCase());
}, {
  maxRetries: 3,
  retryDelay: (attempt) => 1000 * Math.pow(2, attempt), // Exponential backoff
  parallel: false, // Sequential processing
  onBatchStart: (batchDef) => console.log(`Starting ${batchDef.batchId}`),
  onBatchComplete: (batchDef, result) => console.log(`Completed ${batchDef.batchId}`),
  onBatchError: (batchDef, error, attempt) => console.log(`Error in ${batchDef.batchId}: ${error.message}`)
});
```

### Resumable Processing with Cursors

```javascript
// First processing run
try {
  await buffer.processStableBatches(5, processor, {
    cursorName: 'main-processor',
    maxRetries: 2
  });
} catch (error) {
  console.log('Processing interrupted:', error.message);
}

// Resume from where we left off
const resumeResults = await buffer.processStableBatches(5, processor, {
  cursorName: 'main-processor' // Automatically resumes from cursor position
});
```

### Parallel Processing with Synchronized Cursors

```javascript
// Create synchronized cursors for multiple workers
const workers = buffer.createSynchronizedBatchCursors(
  ['worker-1', 'worker-2', 'worker-3'], 
  20 // batch size
);

// Each worker processes different batches but with identical boundaries
const results = await Promise.all([
  processWorkerBatches(workers['worker-1']),
  processWorkerBatches(workers['worker-2']),
  processWorkerBatches(workers['worker-3'])
]);

async function processWorkerBatches(worker) {
  const results = [];
  while (true) {
    const batch = worker.next();
    if (batch.done) break;
    
    // Process this batch
    const result = await processBatch(batch.entries);
    results.push({ batchId: batch.batchDef.batchId, result });
  }
  return results;
}
```

### Batch Cursor Iteration

```javascript
// Create a batch cursor for manual iteration
const cursor = buffer.createBatchCursor('manual-cursor', 15);

while (true) {
  const batch = cursor.next();
  if (batch.done) break;
  
  console.log(`Processing batch ${batch.batchDef.batchId}`);
  console.log(`  Entries: ${batch.entries.length}`);
  console.log(`  ID range: ${batch.batchDef.startId}-${batch.batchDef.endId - 1}`);
  
  // Process entries
  await processEntries(batch.entries);
}

// Check cursor status
const status = cursor.getStatus();
console.log(`Processed batches, ${status.remainingEntries} entries remaining`);
```

### Integration with External Retry Libraries

```javascript
import retry from 'your-retry-library';

// Wrap your processor with external retry logic
const retryProcessor = async (entries, batchDef, context) => {
  return await retry(async () => {
    // Your processing logic that might fail
    return await processEntries(entries);
  }, { 
    retries: 3, 
    factor: 2 
  });
};

// Use with stable batch processing (no built-in retry needed)
const results = await buffer.processStableBatches(10, retryProcessor, {
  maxRetries: 0 // Disable built-in retry since we're using external
});
```

### Handling Missing Entries (Eviction)

```javascript
// Small buffer that will evict entries
const smallBuffer = new RingBuffer(50);

// Add lots of data to force eviction
for (let i = 1; i <= 100; i++) {
  smallBuffer.push(`item-${i}`);
}

// Process with missing entry handling
const results = await smallBuffer.processStableBatches(10, processor, {
  startId: 1, // Some of these entries may be evicted
  skipMissingEntries: true // Skip batches with no available entries
});

// Check which batches were skipped
results.forEach(result => {
  if (result.skipped) {
    console.log(`Batch ${result.batchId} was skipped (entries evicted)`);
  }
});
```

### Advanced Configuration

```javascript
const results = await buffer.processStableBatches(batchSize, processor, {
  // Cursor tracking
  cursorName: 'my-processor',           // Track progress with named cursor
  
  // Range control
  startId: 100,                         // Start from specific entry ID
  endId: 500,                           // End at specific entry ID
  
  // Processing mode
  parallel: true,                       // Process batches in parallel
  
  // Retry configuration
  maxRetries: 5,                        // Maximum retry attempts per batch
  retryDelay: (attempt) => 1000 * attempt, // Custom delay function
  
  // Missing entry handling
  skipMissingEntries: true,             // Skip batches with evicted entries
  
  // Event callbacks
  onBatchStart: (batchDef) => {
    console.log(`Starting ${batchDef.batchId}`);
  },
  onBatchComplete: (batchDef, result) => {
    console.log(`Completed ${batchDef.batchId}`);
  },
  onBatchError: (batchDef, error, attempt) => {
    console.log(`Error in ${batchDef.batchId} (attempt ${attempt}): ${error.message}`);
  }
});
```

### Stable Batch Definitions

```javascript
// Create stable batch definitions without processing
const batchDefs = buffer.createStableBatches(10, {
  startId: 50,
  endId: 150,
  batchIdPrefix: 'custom'
});

console.log(`Created ${batchDefs.length} stable batches`);

// Later, get entries for a specific batch
const entries = buffer.getBatchEntries(batchDefs[0]);
console.log(`Batch ${batchDefs[0].batchId} has ${entries.length} available entries`);
```

### Use Cases

**Data Pipeline Processing**: Process large datasets in reliable, resumable batches
```javascript
await buffer.processStableBatches(100, async (entries) => {
  return await sendToAPI(entries);
}, { cursorName: 'pipeline', maxRetries: 3 });
```

**Parallel Worker Processing**: Multiple workers processing different batches
```javascript
const workers = buffer.createSynchronizedBatchCursors(['w1', 'w2', 'w3'], 50);
// Each worker gets identical batch boundaries for consistent processing
```

**Fault-Tolerant Batch Jobs**: Resume exactly where processing was interrupted
```javascript
// Job can be interrupted and resumed with identical batch boundaries
await buffer.processStableBatches(25, processor, { 
  cursorName: 'batch-job',
  maxRetries: 5 
});
```

**Memory-Efficient Stream Processing**: Process continuous data streams in batches
```javascript
const cursor = buffer.createBatchCursor('stream', 20);
setInterval(async () => {
  const batch = cursor.next();
  if (!batch.done) {
    await processStreamBatch(batch.entries);
  }
}, 1000);
``` 