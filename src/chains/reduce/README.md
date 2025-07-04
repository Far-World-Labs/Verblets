# reduce

Reduce lists via batch processing with automatic retry logic. Each batch is combined with the accumulated result using `listReduceLines` for reliable processing of large datasets.

For single-line reduce operations, use the [list-reduce-lines](../../verblets/list-reduce-lines) verblet.

## Basic Usage

```javascript
import reduce from './index.js';

const logs = ['step one', 'step two', 'step three'];
const result = await reduce(logs, 'summarize', { chunkSize: 10, maxAttempts: 2 });
// => 'summary of steps'
```

## Parameters
<<<<<<< HEAD

- **items** (string[]): Array of items to reduce
- **instructions** (string): Natural language description of reduction operation
- **config** (Object): Configuration options
  - **chunkSize** (number): Items per batch (default: 10)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns a string containing the final reduced result.

## Use Cases

### Summarizing Large Document Collections
```javascript
import reduce from './index.js';

const documents = [
  'Customer feedback shows high satisfaction with product quality...',
  'Sales data indicates strong performance in Q3 across all regions...',
  'Technical support reports show common issues with installation...',
  'Marketing campaign results demonstrate increased brand awareness...'
];

const summary = await reduce(
  documents,
  'create a comprehensive executive summary highlighting key insights',
  { chunkSize: 10 }
);

// Returns a unified summary combining insights from all documents
```
=======

- **items** (string[]): Array of items to reduce
- **instructions** (string): Natural language description of reduction operation
- **config** (Object): Configuration options
  - **chunkSize** (number): Items per batch (default: 10)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns a string containing the final reduced result.

## Features

- **Batch processing**: Handles large datasets by processing items in manageable chunks
- **Automatic retry**: Failed chunks are automatically retried for improved reliability
- **Accumulative reduction**: Progressively combines results from each batch
- **Natural language instructions**: Use descriptive text to define reduction logic

## Use Cases

- Summarizing large document collections
- Aggregating feedback or survey responses
- Combining multiple data sources into unified insights
- Processing logs or event streams for key patterns
>>>>>>> origin/main
