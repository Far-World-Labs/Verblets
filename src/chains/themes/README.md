# themes

Identify recurring themes in long text using two passes of `bulkReduce`.

```javascript
import themes from './index.js';

const transcript = `Our city faces rising rents and increased traffic. Citizens
want more green space and better public transit. Safety remains a concern as the
population grows.`;

const result = await themes(transcript, { topN: 3 });
// => ['housing affordability', 'transportation', 'public safety']
```

