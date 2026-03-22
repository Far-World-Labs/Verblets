# group

Organize items into named categories based on natural language criteria. The AI discovers appropriate group names and assigns each item. A refinement pass merges similar categories.

```javascript
import { group } from '@far-world-labs/verblets';

const symptoms = [
  'persistent headache behind the eyes',
  'nausea after eating',
  'tingling in fingertips',
  'blurred vision when reading',
  'sharp pain in lower back',
  'difficulty sleeping',
  'racing heartbeat at rest',
  'frequent urination at night'
];

const grouped = await group(symptoms, 'group by likely body system involved');
// => {
//   'Neurological': ['persistent headache behind the eyes', 'tingling in fingertips', 'blurred vision when reading'],
//   'Gastrointestinal': ['nausea after eating'],
//   'Musculoskeletal': ['sharp pain in lower back'],
//   'Cardiovascular': ['racing heartbeat at rest'],
//   'Sleep / Autonomic': ['difficulty sleeping', 'frequent urination at night']
// }
```

## API

### `group(array, criteria, config?)`

- **array** (Array): Items to group
- **criteria** (string): Natural language description of how to group
- **config.granularity** (`'low'`|`'high'`): Category breadth. `'low'` merges aggressively into fewer broad groups (topN 5). `'high'` preserves finer distinctions (topN 20). Default: no limit
- **config.topN** (number): Keep only the N largest groups
- **config.categoryPrompt** (string): Custom guidelines for category naming and refinement
- **config.batchSize** (number): Items per batch (auto-calculated from model context window)
- **config.maxParallel** (number): Concurrent batch operations (default: 3)
- **config.maxAttempts** (number): Retry attempts per batch (default: 3)
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<Object>` — Object with group names as keys and arrays of matching items as values

