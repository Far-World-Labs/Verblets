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
  - `batchSize` (number): Items per batch (auto-calculated from model context window)
  - `maxParallel` (number): Maximum parallel batch processing (default: 3)
  - `granularity` (`'low'`|`'high'`): Controls category discovery breadth. `'low'` prefers fewer, broader categories with aggressive merging (topN 5). `'high'` preserves finer-grained distinctions between items (topN 20). Default: no guidance, no topN limit
  - `topN` (number): Limit to top N groups by size
  - `categoryPrompt` (string): Custom category refinement guidelines
  - `maxAttempts` (number): Retry attempts per LLM call (default: 3)
  - `onProgress` (function): Progress callback
  - `abortSignal` (AbortSignal): Signal to cancel the operation
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<Object> - Object with group names as keys and arrays of items as values

