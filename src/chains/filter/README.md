# filter

<<<<<<< HEAD
Filter arrays using AI to identify items that match specific criteria with intelligent reasoning and context awareness.

## Usage
=======
Filter very long lists in manageable chunks using batch processing with automatic retry logic. Each batch is processed individually and failed batches can be retried for improved reliability.

For single-batch filtering, use the [list-filter-lines](../../verblets/list-filter-lines) verblet.

## Basic Usage
>>>>>>> origin/main

```javascript
import filter from './index.js';

<<<<<<< HEAD
const emails = [
  'Meeting tomorrow at 2pm',
  'Urgent: Server maintenance tonight',
  'Lunch invitation for Friday',
  'Critical: Security breach detected',
  'Weekly newsletter update'
];

const urgent = await filter(emails, 'urgent or time-sensitive messages');
// Returns: ['Urgent: Server maintenance tonight', 'Critical: Security breach detected']
```

## API

### `filter(array, criteria, config)`

**Parameters:**
- `array` (Array): Items to filter
- `criteria` (string): Natural language description of what to keep
- `config` (Object): Configuration options
  - `chunkSize` (number): Items per batch (default: 10)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array> - Items that match the criteria

## Use Cases

### Content Moderation
```javascript
import filter from './index.js';

const comments = [
  'Great article, thanks for sharing!',
  'This is completely wrong and stupid',
  'I disagree but respect your opinion',
  'You are an idiot and should shut up',
  'Interesting perspective, never thought of it that way'
];

const appropriate = await filter(comments, 'respectful and constructive comments');
// Returns comments that maintain civil discourse
=======
const diary = [
  'Walked the dog and bought milk.',
  'One day I hope to sail across the Atlantic.',
  'Cleaned out the garage.',
  "Maybe I'll start that bakery I keep dreaming about.",
  'Paid bills and did laundry.',
  'Dreaming of opening a small café downtown.',
  'Fixed the leaky faucet.',
  'I want to learn how to paint landscapes.'
];

const aspirations = await filter(
  diary,
  'Keep only lines about hopes, dreams, or future goals',
  { chunkSize: 3 }
);
// => [
//   'One day I hope to sail across the Atlantic.',
//   "Maybe I'll start that bakery I keep dreaming about.",
//   'Dreaming of opening a small café downtown.',
//   'I want to learn how to paint landscapes.'
// ]
>>>>>>> origin/main
```

## Parameters

- **items** (string[]): Array of items to filter
- **instructions** (string): Natural language filtering criteria
- **config** (Object): Configuration options
  - **chunkSize** (number): Items per batch (default: 10)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an array of strings containing only the items that match the filtering criteria from all processed batches.

## Features

- **Batch processing**: Handles large datasets by processing items in manageable chunks
- **Automatic retry**: Failed chunks are automatically retried for improved reliability
- **Natural language instructions**: Use descriptive text to define filtering logic
- **Memory efficient**: Processes large lists without overwhelming system resources

## Use Cases

- Content moderation for large datasets
- Extracting relevant entries from extensive logs
- Filtering large collections of user feedback
- Processing survey responses to find specific themes
- Cleaning up large text datasets by removing unwanted content

## Advanced Usage

```javascript
// Custom batch size and retry logic
const filteredItems = await filter(
  largeItemList,
  'keep only positive sentiment entries',
  {
    chunkSize: 25,
    maxAttempts: 5,
    llm: { model: 'gpt-4', temperature: 0.1 }
  }
);

// Processing very large datasets
const massiveList = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
const filtered = await filter(
  massiveList,
  'keep only items with even numbers',
  { chunkSize: 50 }
);
```

## Error Handling

The chain automatically retries failed batches up to `maxAttempts` times. If a batch continues to fail after all retry attempts, that batch will be skipped and processing will continue with the remaining batches.
