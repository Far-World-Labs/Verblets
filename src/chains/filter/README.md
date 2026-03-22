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
  - `batchSize` (number): Items per batch (auto-calculated from model context window)
  - `maxAttempts` (number): Retry attempts per LLM call (default: 3)
  - `onProgress` (function): Progress callback
  - `abortSignal` (AbortSignal): Signal to cancel the operation
  - `strictness` (`'low'`|`'high'`|Object): Borderline item handling. `'low'` errs on inclusion with resilient error posture. `'high'` errs on exclusion with strict error posture. Default: no guidance, strict error posture
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<Array> - Items that match the criteria

## Per-Item Mode

Use `filter.with()` to create a single-item predicate compatible with `p-filter` and similar async utilities:

```javascript
import filter from './index.js';
import pFilter from 'p-filter';

const isUrgent = filter.with('urgent or time-sensitive');
const results = await pFilter(emails, isUrgent, { concurrency: 5 });
```

