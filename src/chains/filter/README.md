# filter

Filter arrays using AI to identify items that match specific criteria with intelligent reasoning and context awareness.

## Usage

```javascript
import filter from './index.js';

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
```
