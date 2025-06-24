# split

LLM-powered text splitter that inserts delimiters where your instructions apply.
Use it when you need to divide long text by meaning rather than exact characters.

```javascript
import split from './index.js';

const DELIM = '---763927459---';
const text = `Scene one. Scene two. Scene three.`;
const marked = await split(text, 'before "Scene two" or "Scene three"', {
  delimiter: DELIM,
});
const pieces = marked.split(DELIM);
// => ['Scene one. ', 'Scene two. ', 'Scene three.']
```
