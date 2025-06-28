# group

Group datasets via batch processing by first discovering the best categories and then grouping items into those categories in smaller batches with automatic retry logic.

For single-line grouping operations, use the [list-group-lines](../../verblets/list-group-lines) verblet.

```javascript
import group from './index.js';

const feedback = [
  'Great interface and onboarding',
  'Price is a bit steep',
  'Love the mobile app',
  'Needs more integrations',
];
const result = await group(
  feedback,
  'Is each line praise, criticism, or a feature request?',
  { chunkSize: 2, topN: 3, maxAttempts: 2 }
);
// => { praise: ['Great interface and onboarding', 'Love the mobile app'],
//      criticism: ['Price is a bit steep'],
//      'feature request': ['Needs more integrations'] }
```
