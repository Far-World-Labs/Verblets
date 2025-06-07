# list-expand

Generate additional items that fit naturally with the given list. The function sends the provided items to ChatGPT and requests more entries of the same kind, returning the expanded list.

```javascript
import listExpand from './index.js';

await listExpand(['red', 'green'], 5);
// => ['red', 'green', 'blue', 'yellow', 'purple']
```
