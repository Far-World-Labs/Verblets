# chunk-sentences

Split text into chunks that respect sentence boundaries. Uses the [compromise](https://github.com/spencermountain/compromise) NLP library for sentence detection, falling back to word-based splitting when no sentences are found.

```javascript
import { init } from '@far-world-labs/verblets';

const { chunkSentences } = init();

const chunks = chunkSentences(longArticle, 150);
// => [
//   'Breaking news from the tech world today. Apple announced new features.',
//   'The updates include improved debugging tools and enhanced performance metrics.',
//   'Industry experts are calling this a game-changer for mobile development.'
// ]
```

## API

### `chunkSentences(text, maxLen)`

- **text** (string): Text to split
- **maxLen** (number): Maximum characters per chunk

**Returns:** `string[]` — chunks that stay within `maxLen` while keeping sentences intact. Original text is preserved exactly (no normalization).
