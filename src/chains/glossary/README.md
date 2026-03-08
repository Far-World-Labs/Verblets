# glossary

Identify difficult or technical terms in any text so you can explain them later.
The chain breaks long passages into paragraphs and uses the `map` retry
utility to collect candidate terms from each chunk. Any failed paragraphs are
automatically retried. Finally the terms are ranked by importance using `sort`.

```javascript
import glossary from './index.js';

const blog = `The chef explained how umami develops through the Maillard reaction alongside sous-vide techniques.`;

const terms = await glossary(blog, { maxTerms: 3 });
console.log(terms);
// => ['Maillard reaction', 'sous-vide', 'umami']
```

This is handy when you want to add a quick glossary sidebar to a dense article
so everyday readers aren't left guessing what key terms mean.

## API

### `glossary(text, options)`

**Parameters:**
- `text` (string): Source text to extract terms from
- `options` (Object): Configuration options
  - `maxTerms` (number): Maximum terms to return (default: 10)
  - `sentencesPerBatch` (number): Sentences per extraction window (default: 3)
  - `overlap` (number): Overlapping sentences between windows (default: 1)
  - `batchSize` (number): Text chunks per LLM batch (default: 1)
  - `sortBy` (string): Sorting criteria (default: 'importance for understanding the content')
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<string[]> - Terms sorted by relevance
