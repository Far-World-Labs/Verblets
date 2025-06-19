# Ring Buffer

A small circular buffer for keeping a fixed-size history of items. When the
capacity is reached, the oldest entries are discarded.

## Usage

```javascript
import RingBuffer from '../lib/ring-buffer/index.js';

const buffer = new RingBuffer(3);

buffer.push('a');
buffer.push('b');
buffer.push('c');

buffer.all(); // ['a', 'b', 'c']

buffer.push('d');

buffer.all(); // ['b', 'c', 'd']
```

### Helpers

- `size()` – current number of items
- `capacity()` – maximum number of items
- `isFull()` – whether the buffer has reached capacity
- `head(n)` – first `n` items
- `tail(n)` – last `n` items
- `clear()` – remove all items
- `filter(fn)` – filter items using a predicate
```

