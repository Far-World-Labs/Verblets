# text-units

Identify visible units within any piece of text using an LLM. The chain detects sentences, paragraphs, sections, chapters—whatever structure is present—and returns their character offsets.

```javascript
import textUnits from './index.js';

const diary = `Chapter 1\nI left home today. The air smelled like new beginnings.`;
const units = await textUnits(diary);
console.log(units);
// => [ { type: 'chapter', start: 0, end: 9 },
//      { type: 'sentence', start: 10, end: 34 },
//      { type: 'sentence', start: 35, end: 66 },
//      { type: 'paragraph', start: 10, end: 66 } ]
```

Imagine flipping through an old travel journal. With `text-units`, you can instantly map every heading, paragraph, and sentence to analyze how the story unfolds.
