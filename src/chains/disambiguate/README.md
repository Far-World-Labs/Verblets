# disambiguate

Resolve polysemous terms to the most appropriate meaning using surrounding context.

```javascript
import disambiguate from './index.js';

const result = await disambiguate({
  term: 'bark',
  context: 'I heard the bark while walking in the forest.'
});
// => { term: 'bark', sense: 'dog sound' }
```
