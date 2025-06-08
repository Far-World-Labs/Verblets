# bulk-map

Chunk large lists and map each chunk with `listMap`. Failed chunks can be retried.

## Usage

```javascript
import { bulkMap } from '../../index.js';

const films = [
  'sci-fi epic',
  'romantic comedy',
  'time-travel thriller',
  // ...more titles
];
const results = await bulkMap(films, 'Describe each as a Shakespearean play', { chunkSize: 5 });
// results[0] === 'A saga among the stars'
// results[1] === 'Where hearts and humor entwine'
```

## API

### `bulkMap(list, instructions, [chunkSize])`

Break `list` into batches and map each batch using `listMap`.

- `list` (`string[]`): fragments to process.
- `instructions` (`string`): mapping instructions.
- `chunkSize` (`number`, default `10`): number of items per batch.

Returns `Promise<(string|undefined)[]>` where undefined entries represent failed items.

### `bulkMapRetry(list, instructions, [options])`

Retry undefined entries from `bulkMap` until `maxAttempts` is reached.

- `list` (`string[]`): fragments to process.
- `instructions` (`string`): mapping instructions.
- `options.chunkSize` (`number`, default `10`): size of each batch.
- `options.maxAttempts` (`number`, default `3`): number of passes over failed items.

Returns `Promise<(string|undefined)[]>` aligned with input order.

