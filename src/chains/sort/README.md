# sort

Sort arrays using AI-powered intelligent ordering with context-aware ranking and flexible sorting criteria.

## Usage

```javascript
import sort from './index.js';

const tasks = [
  'Review quarterly reports',
  'Fix critical bug in user login',
  'Update team documentation',
  'Prepare for client presentation'
];

const sorted = await sort(tasks, {
  instructions: 'Sort by business priority and urgency'
});

// Returns tasks ordered by priority:
// [
//   'Fix critical bug in user login',
//   'Prepare for client presentation', 
//   'Review quarterly reports',
//   'Update team documentation'
// ]
```

## API

### `sort(items, config)`

**Parameters:**
- `items` (Array): Array of items to sort
- `config` (Object): Configuration options
  - `instructions` (string): Sorting criteria and context
  - `batchSize` (number): Number of items to process in parallel (default: 20)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array> - Sorted array of items

## Use Cases

### Content Prioritization
```javascript
import sort from './index.js';

const articles = [
  'Advanced React Patterns',
  'Getting Started with JavaScript',
  'CSS Grid Layout Basics',
  'Node.js Performance Optimization'
];

const ordered = await sort(articles, {
  instructions: 'Sort by learning difficulty, easiest first'
});

// Returns articles ordered by beginner-friendliness
```