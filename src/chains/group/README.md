# group

Group datasets via batch processing by first discovering the best categories and then grouping items into those categories in smaller batches with automatic retry logic.

For single-line grouping operations, use the [list-group-lines](../../verblets/list-group-lines) verblet.

## Basic Usage

```javascript
import group from './index.js';

const feedback = [
  'Great interface and onboarding',
  'Price is a bit steep',
  'Love the mobile app',
  'Needs more integrations',
  'Customer support was helpful',
  'App crashes frequently',
  'Would like dark mode option',
  'Excellent documentation'
];
const result = await group(
  feedback,
  'Is each line praise, criticism, or a feature request?',
  { chunkSize: 3, topN: 3, maxAttempts: 2 }
);
// => { 
//   praise: [
//     'Great interface and onboarding', 
//     'Love the mobile app',
//     'Customer support was helpful',
//     'Excellent documentation'
//   ],
//   criticism: ['Price is a bit steep', 'App crashes frequently'],
//   'feature request': ['Needs more integrations', 'Would like dark mode option']
// }
```

## Parameters

- **items** (string[]): Array of items to group
- **instructions** (string): Natural language description of grouping criteria
- **config** (Object): Configuration options
  - **chunkSize** (number): Items per batch during grouping phase (default: 10)
  - **topN** (number): Maximum number of categories to discover (default: 5)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an object where:
- **keys** are the discovered category names (strings)
- **values** are arrays of items (strings) belonging to each category

## Features

- **Two-phase processing**: First discovers optimal categories, then groups items
- **Batch processing**: Handles large datasets by processing items in manageable chunks
- **Automatic retry**: Failed chunks are automatically retried for improved reliability
- **Dynamic categorization**: Categories are discovered from the data, not predefined
- **Natural language instructions**: Use descriptive text to define grouping logic

## Use Cases

- Categorizing customer feedback by type or sentiment
- Organizing documents by topic or theme
- Grouping user comments by intent or purpose
- Classifying support tickets by issue type
- Sorting survey responses by category
- Organizing content by subject matter

## Advanced Usage

```javascript
// Grouping with custom parameters
const emails = [
  'Meeting scheduled for tomorrow',
  'Invoice #1234 is overdue',
  'Great job on the presentation',
  'Server maintenance tonight',
  'Welcome to the team!',
  'Password reset request'
];

const grouped = await group(
  emails,
  'Categorize by email type: administrative, social, technical, or financial',
  {
    chunkSize: 4,
    topN: 4,
    maxAttempts: 5,
    llm: { model: 'gpt-4', temperature: 0.1 }
  }
);

// Processing large datasets
const largeDataset = Array.from({ length: 200 }, (_, i) => `Entry ${i}`);
const categories = await group(
  largeDataset,
  'group by content type or theme',
  { chunkSize: 25, topN: 6 }
);
```

## Two-Phase Process

1. **Category Discovery**: Analyzes a sample of items to identify the best category names
2. **Item Grouping**: Processes all items in batches, assigning each to the discovered categories

## Error Handling

The chain automatically retries failed batches up to `maxAttempts` times. Items from failed batches will be excluded from the final grouping results. Successfully processed items will still be properly categorized.
