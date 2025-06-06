# list-find

Find the first item in a list that matches your instructions using a single ChatGPT call.

```javascript
import listFind from './index.js';

await listFind(
  ['Backpacking through Patagonia', 'A weekend in Paris', 'Safari in Kenya'],
  'Which adventure takes place in South America?'
);
// => 'Backpacking through Patagonia'
```
