# ring-buffer

High-performance ring buffer for single writer, multiple async readers with blocking semantics and offset tracking.

## Usage

```javascript
import RingBuffer from './ring-buffer/index.js';

// Create a ring buffer with capacity for 100 items
const buffer = new RingBuffer(100);

// Register readers and start processing
const reader1 = buffer.registerReader();
const reader2 = buffer.registerReader();

// Write data to buffer
buffer.write('message1');
buffer.write('message2');

// Read single items with offset tracking
const result = await buffer.read(reader1);
// => { data: 'message1', offset: 0 }
```

## Parameters

### Constructor
- **`maxSize`** (number, required): Maximum buffer capacity

### Methods
- **`registerReader()`**: Register a new reader, returns reader ID
- **`unregisterReader(readerId)`**: Remove a reader from the buffer
- **`write(data)`**: Write data to buffer, returns sequence number
- **`read(readerId)`**: Read single item for reader (async, blocks until available)
- **`readBatch(readerId, batchSize)`**: Read batch of items (async, blocks until full batch available)
- **`getStats()`**: Get buffer statistics and reader information

## Return Values

### Single Read Result
```javascript
{
  data: any,        // The actual data item
  offset: number    // Sequence offset for coordination
}
```

### Batch Read Result
```javascript
{
  data: any[],           // Array of data items
  startOffset: number,   // Offset of first item in batch
  lastOffset: number     // Offset of last item in batch
}
```

## Features

- **Double Buffering**: Eliminates wraparound logic for efficient batch reads
- **Blocking Reads**: Readers block until data is available
- **Multiple Independent Readers**: Each reader maintains its own position
- **Offset Tracking**: Returns offset information for external coordination
- **Zero-Copy Slicing**: Efficient batch operations using array slicing
- **Memory Efficient**: Circular buffer design with configurable capacity

## Use Cases

### Message Queue Processing
```javascript
import RingBuffer from './ring-buffer/index.js';

const messageQueue = new RingBuffer(1000);
const processor1 = messageQueue.registerReader();
const processor2 = messageQueue.registerReader();

// Producer
async function produceMessages() {
  for (let i = 0; i < 100; i++) {
    messageQueue.write({ id: i, data: `message-${i}` });
  }
}

// Consumer
async function processMessages(readerId) {
  while (true) {
    const batch = await messageQueue.readBatch(readerId, 10);
    console.log(`Processing batch: ${batch.startOffset}-${batch.lastOffset}`);
    // Process batch.data
  }
}
```

### Event Stream Processing
```javascript
const eventBuffer = new RingBuffer(500);
const analyticsReader = eventBuffer.registerReader();
const loggingReader = eventBuffer.registerReader();

// Event producer
function publishEvent(event) {
  const sequence = eventBuffer.write({
    timestamp: Date.now(),
    type: event.type,
    payload: event.data
  });
  return sequence;
}

// Analytics processor
async function processAnalytics() {
  while (true) {
    const event = await eventBuffer.read(analyticsReader);
    updateMetrics(event.data);
  }
}

// Logging processor
async function processLogs() {
  while (true) {
    const batch = await eventBuffer.readBatch(loggingReader, 50);
    writeBatchToLog(batch.data);
  }
}
```

### Data Pipeline Coordination
```javascript
const pipeline = new RingBuffer(200);
const stage1Reader = pipeline.registerReader();
const stage2Reader = pipeline.registerReader();

// Track processing progress across stages
const processedOffsets = new Map();

async function stage1Processor() {
  while (true) {
    const batch = await pipeline.readBatch(stage1Reader, 5);
    // Process batch
    processedOffsets.set(stage1Reader, batch.lastOffset);
    
    // Check if we can cleanup old data
    const minOffset = Math.min(...processedOffsets.values());
    console.log(`Safe to cleanup data up to offset ${minOffset}`);
  }
}
```

### Real-time Data Streaming
```javascript
const streamBuffer = new RingBuffer(1000);
const realtimeReader = streamBuffer.registerReader();
const batchReader = streamBuffer.registerReader();

// Real-time processor (single items)
async function realtimeProcessor() {
  while (true) {
    const item = await streamBuffer.read(realtimeReader);
    processImmediately(item.data);
  }
}

// Batch processor (bulk operations)
async function batchProcessor() {
  while (true) {
    const batch = await streamBuffer.readBatch(batchReader, 100);
    processBatch(batch.data);
  }
}
```

## Advanced Usage

### Reader Lifecycle Management
```javascript
const buffer = new RingBuffer(100);

// Register readers dynamically
const readers = new Set();
function addReader() {
  const readerId = buffer.registerReader();
  readers.add(readerId);
  return readerId;
}

function removeReader(readerId) {
  buffer.unregisterReader(readerId);
  readers.delete(readerId);
}

// Cleanup on shutdown
process.on('SIGTERM', () => {
  readers.forEach(readerId => buffer.unregisterReader(readerId));
});
```

### Buffer Monitoring
```javascript
function monitorBuffer(buffer) {
  const stats = buffer.getStats();
  console.log(`Buffer Statistics:
    - Total items written: ${stats.sequence}
    - Active readers: ${stats.registeredReaders}
    - Waiting readers: ${stats.waitingReaders}
    - Buffer utilization: ${(stats.sequence % buffer.maxSize) / buffer.maxSize * 100}%
  `);
}

// Monitor every 5 seconds
setInterval(() => monitorBuffer(buffer), 5000);
```

### Graceful Shutdown
```javascript
class BufferManager {
  constructor(maxSize) {
    this.buffer = new RingBuffer(maxSize);
    this.readers = new Map();
    this.shutdown = false;
  }
  
  async gracefulShutdown() {
    this.shutdown = true;
    
    // Wait for all readers to finish current operations
    const shutdownPromises = Array.from(this.readers.keys()).map(async (readerId) => {
      // Signal shutdown to reader processes
      // Wait for clean exit
    });
    
    await Promise.all(shutdownPromises);
    
    // Cleanup all readers
    this.readers.forEach((_, readerId) => {
      this.buffer.unregisterReader(readerId);
    });
  }
}
```

## Integration Patterns

### With Worker Threads
```javascript
import { Worker, isMainThread, parentPort } from 'worker_threads';
import RingBuffer from './ring-buffer/index.js';

if (isMainThread) {
  const buffer = new RingBuffer(1000);
  const worker = new Worker(__filename);
  
  // Share buffer reference with worker
  // Implementation depends on your worker communication strategy
} else {
  // Worker thread processes buffer data
  parentPort.on('message', async (readerId) => {
    while (true) {
      const data = await buffer.read(readerId);
      // Process data in worker thread
    }
  });
}
```

### With Express.js Middleware
```javascript
import express from 'express';
import RingBuffer from './ring-buffer/index.js';

const app = express();
const requestBuffer = new RingBuffer(500);
const analyticsReader = requestBuffer.registerReader();

// Middleware to capture requests
app.use((req, res, next) => {
  requestBuffer.write({
    method: req.method,
    url: req.url,
    timestamp: Date.now(),
    ip: req.ip
  });
  next();
});

// Background analytics processing
async function processAnalytics() {
  while (true) {
    const batch = await requestBuffer.readBatch(analyticsReader, 20);
    // Analyze request patterns
    updateAnalyticsDashboard(batch.data);
  }
}

processAnalytics();
```

## Related Modules

- [`queue`](../queue/README.md) - Simple queue implementation
- [`async-queue`](../async-queue/README.md) - Asynchronous queue with promises
- [`event-emitter`](../event-emitter/README.md) - Event-driven programming utilities

## Error Handling

```javascript
try {
  const buffer = new RingBuffer(100);
  const reader = buffer.registerReader();
  
  // Handle read timeouts (if implemented)
  const result = await buffer.read(reader);
  
} catch (error) {
  if (error.code === 'BUFFER_OVERFLOW') {
    console.log('Buffer capacity exceeded');
  } else if (error.code === 'READER_NOT_FOUND') {
    console.log('Invalid reader ID');
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

## Performance Considerations

- **Buffer Sizing**: Choose buffer size based on peak write rate and reader processing speed
- **Batch Processing**: Use `readBatch()` for better throughput when processing multiple items
- **Reader Management**: Unregister unused readers to prevent memory leaks
- **Monitoring**: Track buffer statistics to identify bottlenecks and optimize performance

