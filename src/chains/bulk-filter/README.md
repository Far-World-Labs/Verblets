# bulk-filter

Filter very long lists in manageable chunks using `listFilter`. Failed batches can be retried.

```javascript
import bulkFilter from './index.js';

const diary = [
  'Walked the dog and bought milk.',
  'One day I hope to sail across the Atlantic.',
  'Cleaned out the garage.',
  "Maybe I'll start that bakery I keep dreaming about.",
];

const aspirations = await bulkFilter(
  diary,
  'Keep only lines about hopes or big dreams',
  { chunkSize: 2 }
);
// => ['One day I hope to sail across the Atlantic.', "Maybe I'll start that bakery I keep dreaming about."]
```
