# find

Scan long lists in manageable batches to locate the item that best matches your instructions. Uses batch processing with automatic retry logic to efficiently search through large datasets.

For single-batch finding, use the [list-find-lines](../../verblets/list-find-lines) verblet.

## Basic Usage

```javascript
import find from './index.js';

const emails = [
  'update from accounting',
  'party invitation', 
  'weekly newsletter',
  'urgent security alert',
  'meeting reminder',
  'quarterly report ready',
  // ... potentially thousands more
];
const urgent = await find(emails, 'Which email is most urgent or time-sensitive?');
// => 'urgent security alert'
```

## Parameters

- **items** (string[]): Array of items to search through
- **instructions** (string): Natural language description of what to find
- **config** (Object): Configuration options
  - **chunkSize** (number): Items per batch (default: 10)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns a string containing the single best matching item from the entire list, or `null` if no suitable match is found.

## Features

- **Batch processing**: Handles large datasets by processing items in manageable chunks
- **Automatic retry**: Failed chunks are automatically retried for improved reliability
- **Best match selection**: Finds the single best item across all batches
- **Natural language queries**: Use descriptive text to define search criteria

## Use Cases

- Finding the most relevant document in a large collection
- Locating specific entries in extensive logs or datasets
- Identifying priority items from long task lists
- Discovering key information from large text collections
- Searching for specific patterns or content across multiple items

## Advanced Usage

```javascript
// Finding with custom batch size and retry logic
const bestMatch = await find(
  largeDocumentList,
  'find the document that explains the pricing policy',
  {
    chunkSize: 25,
    maxAttempts: 5,
    llm: { model: 'gpt-4', temperature: 0.1 }
  }
);

// Finding in different types of content
const tasks = [
  'Update website homepage',
  'Fix critical database bug',
  'Plan team meeting',
  'Review quarterly budget'
];
const critical = await find(tasks, 'which task is most critical or urgent?');
// => 'Fix critical database bug'
```

## Error Handling

The chain automatically retries failed batches up to `maxAttempts` times. If processing fails for some batches, the function will still return the best match found from successfully processed batches, or `null` if no matches were found.

```javascript
import bulkFind from './index.js';

const emails = [
  'update from accounting',
  'party invitation',
  'weekly newsletter',
  // ... potentially thousands more
];
const best = await bulkFind(emails, 'Which email is most urgent?');
// => 'update from accounting'
```
