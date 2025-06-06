# bulk-find

Search large lists in batches using `listFind` and return the first matching item.
Failed batches can be retried with `bulkFindRetry`.

```javascript
import bulkFind, { bulkFindRetry } from './index.js';

const diaryEntries = [
  'Hiked up the mountains today and saw breathtaking views',
  'Visited the local market and tried a spicy stew',
  'Spotted penguins playing on the beach this morning'
];
const penguinMoment = await bulkFindRetry(diaryEntries, 'mentions penguins', {
  chunkSize: 2
});
// penguinMoment === 'Spotted penguins playing on the beach this morning'
```
