# commonalities

Find common threads between multiple items using an LLM. The verblet checks every combination from pairs up to the full set. If no relationship is obvious, an empty array is returned.

```javascript
import commonalities from './index.js';

await commonalities(['smartphone', 'tablet', 'laptop']);
// => ['Portable electronics', 'Portable computers']

// Provide custom instructions for how to find commonalities
await commonalities(['car', 'bicycle', 'train'], {
  instructions: 'focus on transportation methods available in a city',
});
// => ['Wheeled vehicles', 'Public transit']
```
