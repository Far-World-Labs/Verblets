# name

Generate a short, memorable name from a description of definition. The verblet asks an LLM to suggest a concise variable-style name.

```javascript
import name from './index.js';

const foundName = await name('A spreadsheet of every pastry I ate on my travels across Europe');
// => 'travelPastryLog'
```
