# reduce

Reduce lists via batch processing with automatic retry logic. Each batch is combined with the accumulated result using `listReduceLines` for reliable processing of large datasets.

For single-line reduce operations, use the [list-reduce-lines](../../verblets/list-reduce-lines) verblet.

```javascript
import reduce from './index.js';

const logs = ['step one', 'step two', 'step three'];
const result = await reduce(logs, 'summarize', { chunkSize: 10, maxAttempts: 2 });
// => 'summary of steps'
```

## Features

- **Batch processing**: Handles large datasets by processing items in manageable chunks
- **Automatic retry**: Failed chunks are automatically retried for improved reliability
- **Accumulative reduction**: Progressively combines results from each batch
- **Natural language instructions**: Use descriptive text to define reduction logic
