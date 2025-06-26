# chunk-sentences

Simple text chunker that splits at sentence boundaries when possible.

```javascript
import chunkSentences from './index.js';

const text = "First sentence. Second sentence! Third sentence?";
const chunks = chunkSentences(text, 30);
```

## API

### `chunkSentences(text, maxLen)`

- `text` (string): Text to chunk
- `maxLen` (number): Maximum chunk length in characters
- Returns: `string[]` - Array of text chunks

Splits text at sentence boundaries using compromise library. Falls back to word-based chunking if no sentences detected. Preserves original text exactly through slicing. 