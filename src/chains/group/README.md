# group

Organize arrays into logical groups using AI-powered categorization with intelligent reasoning and flexible grouping strategies.

## Usage

```javascript
import group from './index.js';

const tasks = [
  'Update website homepage',
  'Fix database connection bug',
  'Plan team meeting agenda',
  'Review quarterly budget',
  'Debug API timeout issues',
  'Schedule client presentation'
];

const organized = await group(tasks, 'organize by work type');
// Returns: {
//   'Development': ['Update website homepage', 'Fix database connection bug', 'Debug API timeout issues'],
//   'Management': ['Plan team meeting agenda', 'Review quarterly budget', 'Schedule client presentation']
// }
```

## API

### `group(array, criteria, config)`

**Parameters:**
- `array` (Array): Items to group
- `criteria` (string): Natural language description of how to group
- `config` (Object): Configuration options
  - `chunkSize` (number): Items per batch (default: 10)
  - `llm` (Object): LLM model options

**Returns:** Promise<Object> - Object with group names as keys and arrays of items as values

## Use Cases

### Content Organization
```javascript
import group from './index.js';

const articles = [
  'How to secure your database',
  'Best practices for UI design',
  'Understanding machine learning basics',
  'CSS grid layout tutorial',
  'Introduction to neural networks',
  'SQL injection prevention guide'
];

const categories = await group(articles, 'group by technical domain');
// Returns organized articles by programming area
```
