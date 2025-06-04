# list-reduce

Combine an accumulator value with a list of strings using custom instructions in a single ChatGPT call. Returns the final accumulator.

```javascript
import listReduce from './index.js';

await listReduce('', ['alpha', 'beta', 'gamma'], 'Concatenate them');
// => 'alpha beta gamma'
```
