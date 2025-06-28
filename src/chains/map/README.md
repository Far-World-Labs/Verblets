# map

Map over lists via batch processing with automatic retry logic for failed chunks. This chain handles large datasets by processing items in chunks while maintaining order and reliability.

For single-line mapping operations, use the [list-map-lines](../../verblets/list-map-lines) verblet.

## Usage

```javascript
import map from './index.js';

const films = [
  'sci-fi epic',
  'romantic comedy',
  'time-travel thriller',
  // ...more titles
];
const results = await map(films, 'Describe each as a Shakespearean play', { chunkSize: 5 });
// results[0] === 'A saga among the stars'
// results[1] === 'Where hearts and humor entwine'
```

## API

### `map(list, instructions, [options])`

Break `list` into batches and map each batch using `listMapLines` with automatic retry for failed items.

- `list` (`string[]`): fragments to process.
- `instructions` (`string`): mapping instructions.
- `options.chunkSize` (`number`, default `10`): number of items per batch.
- `options.maxAttempts` (`number`, default `3`): number of retry passes over failed items.

Returns `Promise<(string|undefined)[]>` where undefined entries represent items that failed after all retry attempts.

## Reliability Features

- **Automatic chunking**: Large lists are processed in manageable batches
- **Retry logic**: Failed items are automatically retried up to `maxAttempts` times
- **Order preservation**: Results maintain the same order as input items
- **Partial success**: Successfully processed items are returned even if some fail

## Integration with Other Chains

```javascript
import map from './index.js';
import score from '../score/index.js';

// Transform items, then score the results
const descriptions = await map(items, 'Write a one-line description');
const { scores } = await score(descriptions, 'How engaging is this description?');
```

