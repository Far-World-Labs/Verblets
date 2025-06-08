# list-filter

Filter a list with a single ChatGPT call using custom instructions.

```javascript
import listFilter from './index.js';

const reflections = [
  'Losing that match taught me the value of persistence.',
  "I hate losing and it proves I'm worthless.",
  'After failing my exam, I studied harder and passed the retake.',
  "No matter what I do, I'll never succeed.",
];
const growth = await listFilter(
  reflections,
  'keep only reflections that show personal growth or learning from mistakes'
);
// => [
//   'Losing that match taught me the value of persistence.',
//   'After failing my exam, I studied harder and passed the retake.',
// ]
```
