# extract-blocks

Extract structured blocks of information from unstructured text using AI-powered analysis with overlapping windows for better context.

## Usage

```javascript
import { extractBlocks } from '@far-world-labs/verblets';

const logText = `
2024-04-01 10:15:23 INFO Starting batch process
  Processing 1500 records from database

2024-04-01 10:15:45 ERROR Connection timeout
  Failed to connect to server: db.example.com

2024-04-01 10:15:50 INFO Connection restored
  Successfully reconnected to database
`;

const blocks = await extractBlocks(
  logText,
  'Extract complete log entries including their continuation lines'
);

// Result:
// [
//   [
//     "2024-04-01 10:15:23 INFO Starting batch process",
//     "  Processing 1500 records from database"
//   ],
//   [
//     "2024-04-01 10:15:45 ERROR Connection timeout",
//     "  Failed to connect to server: db.example.com"
//   ],
//   [
//     "2024-04-01 10:15:50 INFO Connection restored",
//     "  Successfully reconnected to database"
//   ]
// ]
```

## API

### `extractBlocks(text, instructions, config)`

**Parameters:**
- `text` (string): The unstructured text to process
- `instructions` (string): Natural language instructions for identifying block boundaries
- `config` (Object): Configuration options
  - `precision` (`'low'`|`'high'`|Object): Coordinates window and overlap size for boundary detection. `'low'` uses larger windows with less overlap (200/10). `'high'` uses smaller windows with more overlap (50/30). Default: 100 window, 20 overlap
  - `maxParallel` (number): Concurrent window processing (default: 3)
  - `llm` (string|Object): LLM model options
  - `onProgress` (Function): Progress callback
  - `abortSignal` (AbortSignal): Signal to cancel the operation

**Returns:** Promise<Array<Array\<string>>> - Array of blocks, each block is an array of lines
