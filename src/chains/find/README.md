# find

Scan long lists in manageable batches to locate the item that best matches your instructions.

```javascript
import bulkFind from './index.js';

const emails = [
  'update from accounting',
  'party invitation',
  'weekly newsletter',
  // ... potentially thousands more
];
const best = await bulkFind(emails, 'Which email is most urgent?');
// => 'update from accounting'
```
