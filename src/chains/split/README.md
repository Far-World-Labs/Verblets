# split

Split text into segments at semantically meaningful boundaries. The AI places split markers based on your criteria — topic shifts, argument boundaries, tone changes — then the chain validates that the output preserves the original text.

```javascript
import { split } from '@far-world-labs/verblets';

const legalBrief = `The defendant entered the premises at approximately 11:30 PM.
Security footage shows them proceeding directly to the server room.
They accessed three terminals over a period of forty minutes.
Meanwhile, the night security guard was conducting rounds on the second floor.
At 12:15 AM, an automated alert triggered when the backup system detected
an unauthorized export of the customer database.
The guard responded within four minutes and found the server room empty.
Digital forensics later confirmed that 2.3 million records were copied
to an external device during the forty-minute window.`;

const segments = await split(legalBrief, 'separate by narrative event');
// => [
//   'The defendant entered the premises... forty minutes.',
//   'Meanwhile, the night security guard... server room empty.',
//   'Digital forensics later confirmed... forty-minute window.'
// ]
```

The criteria describe *what kind of boundary to look for*, and the AI decides where those boundaries fall. This handles cases where a regex or sentence splitter would miss the semantic structure.

## API

### `split(text, criteria, config)`

- **text** (string): Text to split
- **criteria** (string): Natural language description of where to split
- **config.chunkLen** (number): Maximum characters per processing chunk (default: 4000)
- **config.targetSplitsPerChunk** (number): Approximate splits per chunk
- **config.preservation** (`'low'`|`'high'`|Object): How closely the output must match the original text. `'low'` allows more deviation (0.7 short / 0.25 long thresholds). `'high'` enforces tight fidelity (0.3 / 0.05). Default: 0.5 / 0.1
- **config.delimiter** (string): Custom delimiter string for marking split points
- **config.maxAttempts** (number): Maximum retry attempts (default: 2)
- **config.llm** (string|Object): LLM model configuration (default: `{ fast: true, good: true, cheap: true }`)
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation

**Returns:** `Promise<string[]>` — Array of text segments
