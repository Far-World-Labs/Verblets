# bulk-reduce

Reduce long lists by processing them in smaller batches. Each batch is combined
with the accumulated result using `listReduce`.

```javascript
import bulkReduce from './index.js';

const logs = ['step one', 'step two', 'step three'];
const result = await bulkReduce(logs, 'summarize');
// => 'summary of steps'
```
