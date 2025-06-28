# list-find

Find the single best match in a list using natural language instructions.

```javascript
import listFind from './index.js';

const snacks = ['apple pie', 'fruit roll-up', 'carrot sticks'];
await listFind(snacks, 'which snack feels most nostalgic for kids of the 90s?');
// => 'fruit roll-up'
```
