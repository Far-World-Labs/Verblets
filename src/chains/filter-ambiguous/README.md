# filter-ambiguous

Identify ambiguous words or phrases in text. Sentences are first scored for overall uncertainty and the highest scoring ones are examined for unclear terms. Each term is scored in context so you can zero in on the most confusing language.

```javascript
import filterAmbiguous from './index.js';

const text = `I saw her duck\nThe magician made a little girl disappear\nHe fed her dog food`;
const result = await filterAmbiguous(text, { topN: 3 });
// => [{ term: 'duck', sentence: 'I saw her duck', score: 9 }, ...]
```
