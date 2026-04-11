# commonalities

Find common threads between multiple items using a single LLM call. If no relationship is obvious, an empty array is returned. Accepts a `depth` option (`'low'`, `'med'`, `'high'`) to control analysis depth from surface-level features to abstract structural patterns.

```javascript
import { commonalities } from '@far-world-labs/verblets';

await commonalities(['smartphone', 'tablet', 'laptop']);
// => ['Portable electronics', 'Portable computers']

// Provide custom instructions for how to find commonalities
await commonalities(['car', 'bicycle', 'train'], {
  instructions: 'focus on transportation methods available in a city',
});
// => ['Wheeled vehicles', 'Public transit']
```
