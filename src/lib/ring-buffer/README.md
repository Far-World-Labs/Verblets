# ring-buffer

Efficient circular buffer implementation for managing fixed-size collections with automatic overflow handling and memory optimization.

## Usage

```javascript
import RingBuffer from './index.js';

const buffer = new RingBuffer(3);

buffer.push('first');
buffer.push('second');
buffer.push('third');
buffer.push('fourth');  // Overwrites 'first'

console.log(buffer.toArray());  // ['second', 'third', 'fourth']
console.log(buffer.size);       // 3
console.log(buffer.length);     // 3
```

## API

### Constructor

#### `new RingBuffer(capacity)`

**Parameters:**
- `capacity` (number): Maximum number of items the buffer can hold

### Methods

#### `push(item)`
Add an item to the buffer. If at capacity, overwrites the oldest item.

#### `pop()`
Remove and return the most recently added item.

#### `peek()`
Return the most recently added item without removing it.

#### `get(index)`
Get item at specific index (0 = oldest, capacity-1 = newest).

#### `toArray()`
Return all items as an array in insertion order.

#### `clear()`
Remove all items from the buffer.

#### `isFull()`
Check if buffer is at maximum capacity.

#### `isEmpty()`
Check if buffer contains no items.

### Properties

#### `size`
Current number of items in the buffer.

#### `length`
Alias for `size` property.

#### `capacity`
Maximum number of items the buffer can hold.

## Features

- **Memory Efficient**: Fixed memory allocation regardless of usage patterns
- **Automatic Overflow**: Seamlessly handles capacity overflow by overwriting oldest items
- **Array-like Interface**: Familiar methods and properties for easy adoption
- **Performance Optimized**: O(1) operations for push, pop, and peek
- **Flexible Access**: Support for both LIFO and indexed access patterns

## Use Cases

### Recent Items Tracking
```javascript
import RingBuffer from './index.js';

const recentFiles = new RingBuffer(10);

function openFile(filename) {
  recentFiles.push(filename);
  updateRecentFilesMenu(recentFiles.toArray());
}
```

### Performance Monitoring
```javascript
const responseTimeBuffer = new RingBuffer(100);

function recordResponseTime(time) {
  responseTimeBuffer.push(time);
  
  if (responseTimeBuffer.isFull()) {
    const average = responseTimeBuffer.toArray()
      .reduce((sum, time) => sum + time, 0) / responseTimeBuffer.size;
    console.log(`Average response time: ${average}ms`);
  }
}
```

### Log Management
```javascript
const logBuffer = new RingBuffer(1000);

function log(message) {
  logBuffer.push({
    timestamp: Date.now(),
    message: message
  });
}

function getRecentLogs(count = 50) {
  const logs = logBuffer.toArray();
  return logs.slice(-count);
}
```

