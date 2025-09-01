# extract-blocks

Extract structured blocks of information from unstructured text using AI-powered analysis with overlapping windows for better context.

## Usage

```javascript
// Extract log entries that may span multiple lines
const logText = `
2024-04-01 10:15:23 INFO Starting batch process
  Processing 1500 records from database

2024-04-01 10:15:45 ERROR Connection timeout
  Failed to connect to server: db.example.com

2024-04-01 10:15:50 INFO Connection restored
  Successfully reconnected to database
`;

const blocks = await extractBlocks(logText, {
  blockType: 'log entry',
  instruction: 'Extract complete log entries including their continuation lines'
});

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

## Parameters

- **text** (string): The unstructured text to process
- **options** (object):
  - **blockType** (string): Description of what to extract (e.g., "log entry", "transaction", "event")
  - **instruction** (string): Natural language instruction for extraction
  - **chunkSize** (number): Size of each text chunk in characters (default: 3000)
  - **overlapSize** (number): Overlap between chunks in characters (default: 500)
  - **maxParallel** (number): Maximum parallel processing threads (default: 3)