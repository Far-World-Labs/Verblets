# ring-buffer

Single-writer, multiple-reader async ring buffer with backpressure. Uses a double-buffer technique to eliminate wraparound logic — readers get contiguous slices without copying.

```javascript
import { init } from '@far-world-labs/verblets';

const { ringBuffer: RingBuffer } = init();

const buf = new RingBuffer(1000);
const reader = buf.reader();

await buf.write('hello');
await buf.write('world');

const messages = await reader.take(2);   // => ['hello', 'world']
console.log(reader.lag());               // => 0
```

## API

### `new RingBuffer(maxSize = 1000)`

Creates a buffer that holds up to `maxSize` items. Writes block (or throw in sync mode) when any reader is `maxSize` messages behind.

### Writer

- **`write(data, options?)`** — async write; blocks if a reader would overflow. Pass `{ force: true }` to skip the overflow check.
- **`writeSync(data, options?)`** — synchronous write; throws on overflow instead of blocking.

### `buf.reader(startOffset?)`

Creates a `Reader` positioned at `startOffset` (defaults to the next unread message).

**Reader methods:**

- **`take(count)`** — non-blocking; returns up to `count` available messages immediately.
- **`takeOrWait(count, timeout)`** — blocks until `count` messages are available or `timeout` ms elapse, returning a partial batch on timeout.
- **`read(count, options?)`** — like `take` but returns `{ data, startOffset, lastOffset }` for offset tracking.
- **`lag()`** — how many unread messages this reader is behind.
- **`ack(newOffset)`** — advance position without consuming (manual offset management).
- **`lookback(n, fromOffset?)`** — peek at `n` recent messages without consuming.
- **`fork(offset?)`** — create a new reader starting from this reader's position (or a specific offset).
- **`pause()` / `unpause()`** — pausing a reader blocks the writer when that reader would overflow; unpause releases blocked writes.
- **`close()`** — remove this reader from the buffer.

### Buffer utilities

- **`lookback(n, fromOffset?)`** — buffer-level lookback (not tied to a reader).
- **`stats()`** — returns `{ maxSize, writeIndex, sequence, readers, waitingReads, waitingWriters }`.
- **`latest()`** — sequence number of the most recent write.
- **`clear()`** — resets all state, resolves waiting reads with empty results, rejects waiting writes.
