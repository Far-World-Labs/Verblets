# bulkmap

Chunk large lists and map each chunk with `listMap`. Failed chunks can be retried.
`bulkMap` is exported as the default entry.

## Usage

```javascript
import bulkMap from './index.js';

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

