# probe-scan

Scan text for probe matches using local embeddings. Compares text chunks against pre-embedded probe vectors using cosine similarity — no data leaves the machine.

## Usage

```javascript
import probeScan from './index.js';
import { embedProbes } from '../../lib/embed/index.js';

const probes = await embedProbes([
  { category: 'pii', label: 'email address' },
  { category: 'pii', label: 'phone number' },
]);

const result = await probeScan('Contact me at john@example.com', probes);
// Returns: { flagged: true, hits: [{ category: 'pii', label: 'email address', score: 0.82, chunk: { text: '...', start: 0, end: 30 } }] }
```

## API

### `probeScan(textOrChunks, probes, config)`

**Parameters:**
- `textOrChunks` (string|Array): Text to scan, or pre-embedded chunks with `{ text, vector, start, end }`
- `probes` (Array): Pre-embedded probes from `embedProbes()` with `{ category, label, vector }`
- `config` (Object): Configuration options
  - `detection` (`'low'`|`'high'`|number): Controls detection sensitivity via cosine similarity threshold. `'low'` uses a higher threshold (0.55) for fewer hits and fewer false positives. `'high'` uses a lower threshold (0.3) for more hits, catching weaker signals. Default: 0.4
  - `categories` (string[]): Only scan for these category strings
  - `maxTokens` (number): Chunk size for long texts (default: 256)
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<{ flagged: boolean, hits: Array<{ category, label, score, chunk }> }> - Hits sorted by score descending
