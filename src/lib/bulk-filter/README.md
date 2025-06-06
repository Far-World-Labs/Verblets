# bulk-filter

Filter long lists in batches using `listFilter`. Batches that fail can be retried.

```javascript
import bulkFilter from './index.js';

const reflections = [
  'Losing that match taught me the value of persistence.',
  "I hate losing and it proves I'm worthless.",
  'After failing my exam, I studied harder and passed the retake.',
  "No matter what I do, I'll never succeed.",
];
const growth = await bulkFilter(
  reflections,
  'keep only reflections that show personal growth or learning from mistakes'
);
// growth === [
//   'Losing that match taught me the value of persistence.',
//   'After failing my exam, I studied harder and passed the retake.',
// ]
```
