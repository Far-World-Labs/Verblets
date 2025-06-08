# intersection

Find common threads between multiple items using an LLM. The verblet checks every combination from pairs up to the full set. If no relationship is obvious, an empty array is returned.

```javascript
import intersection from './index.js';

await intersection(['smartphone', 'tablet', 'laptop']);
// => ['Portable electronics', 'Portable computers']

// Provide custom instructions for how to find intersections
await intersection(['car', 'bicycle', 'train'], {
  instructions: 'focus on transportation methods available in a city',
});
// => ['Wheeled vehicles', 'Public transit']
```
