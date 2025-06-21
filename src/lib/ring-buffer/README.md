# High-Performance Ring Buffer

A high-performance ring buffer for single writer, multiple async readers with blocking semantics and offset tracking for coordination.

## Key Features

- **Double Buffering**: Eliminates wraparound logic for efficient batch reads
- **Blocking Reads**: Readers block until data is available
- **Multiple Independent Readers**: Each reader maintains its own position
- **Offset Tracking**: Returns offset information for external coordination
- **Zero-Copy Slicing**: Efficient batch operations using array slicing

## Example Usage

```javascript
import RingBuffer from './index.js';

const buffer = new RingBuffer(100);

// Register readers
const reader1 = buffer.registerReader();
const reader2 = buffer.registerReader();

// Write data
buffer.write('message1');
buffer.write('message2');
buffer.write('message3');

// Read single items with offset tracking
const result1 = await buffer.read(reader1);
// { data: 'message1', offset: 0 }

// Read batches with offset tracking
const batch = await buffer.readBatch(reader2, 2);
// { data: ['message1', 'message2'], startOffset: 0, lastOffset: 1 }

// Coordinate multiple readers using offsets
const processedOffsets = new Map();
processedOffsets.set(reader1, result1.offset);
processedOffsets.set(reader2, batch.lastOffset);

const minOffset = Math.min(...processedOffsets.values());
console.log(`Safe to cleanup data up to offset ${minOffset}`);
```

## API

### Constructor
```javascript
const buffer = new RingBuffer(maxSize);
```

### Reader Management
```javascript
const readerId = buffer.registerReader();
buffer.unregisterReader(readerId);
```

### Writing
```javascript
const sequence = buffer.write(data);
```

### Reading
```javascript
// Single item - blocks until available
const result = await buffer.read(readerId);
// Returns: { data: any, offset: number }

// Batch - blocks until full batch available
const batch = await buffer.readBatch(readerId, batchSize);
// Returns: { data: any[], startOffset: number, lastOffset: number }
```

### Utilities
```javascript
const stats = buffer.getStats();
console.log(`Buffer usage: ${stats.sequence} items written`);
console.log(`Active readers: ${stats.registeredReaders}`);
console.log(`Waiting readers: ${stats.waitingReaders}`);
```

