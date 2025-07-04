# find

Find items in arrays that match specific criteria using AI-powered search with intelligent reasoning and context understanding.

## Usage

```javascript
import find from './index.js';

const documents = [
  'Meeting notes from Q1 planning session',
  'Budget proposal for new marketing campaign',
  'Technical specification for API endpoints',
  'Employee handbook updates for remote work',
  'Security audit report findings'
];

const technical = await find(documents, 'technical documentation');
// Returns: 'Technical specification for API endpoints'
```

## API

### `find(array, criteria, config)`

**Parameters:**
- `array` (Array): Items to search through
- `criteria` (string): Natural language description of what to find
- `config` (Object): Configuration options
  - `chunkSize` (number): Items per batch (default: 10)
  - `llm` (Object): LLM model options

**Returns:** Promise<string|null> - First item that matches criteria, or null if none found

## Use Cases

### Document Search
```javascript
import find from './index.js';

const files = [
  'project-timeline.pdf',
  'budget-2024.xlsx',
  'user-manual.docx',
  'meeting-notes.txt',
  'invoice-template.pdf'
];

const userDoc = await find(files, 'user documentation or manual');
// Returns: 'user-manual.docx'
```
