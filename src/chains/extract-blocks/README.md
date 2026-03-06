# extract-blocks

Extract structured blocks of information from unstructured text using AI-powered analysis with overlapping windows for better context.

## Usage

```javascript
import { extractBlocks } from './index.js';

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
  - `windowSize` (number): Lines per processing window (default: 100)
  - `overlapSize` (number): Lines of overlap between windows (default: 20)
  - `maxParallel` (number): Concurrent window processing (default: 3)
  - `maxAttempts` (number): Retry attempts per window (default: 3)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<Array\<string>>> - Array of blocks, each block is an array of lines
