# list-partition

Partition a list into stable groups using custom instructions. Optionally
provide a list of categories to maintain consistency across runs.

```javascript
import listPartition from './index.js';

const categories = ['fruit', 'vegetable'];
await listPartition(
  ['apple', 'banana', 'carrot'],
  'Classify each item',
  categories
);
// => { fruit: ['apple', 'banana'], vegetable: ['carrot'] }
```
