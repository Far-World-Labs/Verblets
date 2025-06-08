# coreference

Resolve what pronouns like "he", "she" or "it" refer to inside a passage of text.
The chain walks backward through the text using a sliding window of nearby sentences
so later clues can help clarify earlier references.

```javascript
import coreference from './index.js';

const text = `Alice handed Bob her notebook. He thanked her and put it on the table.`;
const result = await coreference(text);
console.log(result);
/*
[
  { pronoun: 'it', reference: 'the notebook', sentence: 'He thanked her and put it on the table.' },
  { pronoun: 'her', reference: 'Alice', sentence: 'He thanked her and put it on the table.' },
  { pronoun: 'he', reference: 'Bob', sentence: 'He thanked her and put it on the table.' },
  { pronoun: 'her', reference: 'Alice', sentence: 'Alice handed Bob her notebook.' }
]
*/
```
