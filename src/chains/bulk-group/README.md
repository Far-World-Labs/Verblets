# bulk-group

Group long lists by first discovering the best categories and then grouping
items into those categories in smaller batches.

```javascript
import bulkGroup from './index.js';

const feedback = [
  'Great interface and onboarding',
  'Price is a bit steep',
  'Love the mobile app',
  'Needs more integrations',
];
const result = await bulkGroup(
  feedback,
  'Is each line praise, criticism, or a feature request?',
  { chunkSize: 2, topN: 3 }
);
// => { praise: ['Great interface and onboarding', 'Love the mobile app'],
//      criticism: ['Price is a bit steep'],
//      'feature request': ['Needs more integrations'] }
```
