# map

Transform every item in a list according to natural language instructions. Items are processed in parallel batches with automatic retry for any that fail.

```javascript
import { map } from '@far-world-labs/verblets';

const errorMessages = [
  'ECONNREFUSED 127.0.0.1:5432',
  'TypeError: Cannot read properties of undefined (reading "map")',
  'ENOMEM: not enough memory, cannot allocate 2147483648 bytes',
  'SSL_ERROR_HANDSHAKE_FAILURE_ALERT on port 443',
  'SIGKILL: process exited with code 137'
];

const explanations = await map(
  errorMessages,
  'Explain what went wrong and what to check first, in one sentence a junior dev would understand'
);
// => [
//   'The app can\'t connect to your PostgreSQL database — check if it\'s running.',
//   'Your code tried to call .map() on something that doesn\'t exist — trace the variable back.',
//   'The process asked for 2 GB of memory and the system refused — check for memory leaks or raise the limit.',
//   'The SSL/TLS handshake failed — check that certificates are valid and ports match.',
//   'The system forcibly killed the process (usually out of memory) — check container memory limits.'
// ]
```

## API

### `map(list, instructions, config?)`

- **list** (string[]): Items to transform
- **instructions** (string): Natural language transformation to apply to each item
- **config.batchSize** (number): Items per batch (auto-calculated from model context window)
- **config.maxParallel** (number, default 3): Concurrent batch requests
- **config.maxAttempts** (number, default 3): Retry passes over failed items
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<(string|undefined)[]>` — Transformed items in the same order. `undefined` entries represent items that failed after all retry attempts.

## Per-Item Mode

`map.with()` creates a single-item function for use with `p-map` or similar async utilities:

```javascript
import { map } from '@far-world-labs/verblets';
import pMap from 'p-map';

const translate = map.with('translate to French');
const results = await pMap(items, translate, { concurrency: 5 });
```

