# polysemy

Extract the most ambiguous or polysemous terms from a block of text. The chain splits long inputs into manageable chunks and uses `bulkMap` to identify candidates from each chunk. Results are ranked by frequency so the most ambiguous terms appear first.

```javascript
import polysemy from './index.js';

const text = `The old port near the river was quieter than the USB port on my laptop.`;
const terms = await polysemy(text, { topN: 3 });
// => ['port', '...']
```
