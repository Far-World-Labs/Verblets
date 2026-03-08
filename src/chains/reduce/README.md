# reduce

Accumulate values across a collection by applying transformation instructions sequentially, supporting both simple and structured outputs.

## Usage

```javascript
import reduce from './index.js';

// Simple accumulation
const items = ['one', 'two', 'three', 'four'];
const result = await reduce(items, 'concatenate with commas', { initial: '' });
// Returns: "one, two, three, four"

// Structured output with response format
const scores = [85, 92, 78, 95, 88];
const summary = await reduce(
  scores,
  'calculate statistics',
  {
    initial: { sum: 0, count: 0, max: 0, min: 100 },
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: 'stats',
        schema: {
          type: 'object',
          properties: {
            sum: { type: 'number' },
            count: { type: 'number' },
            max: { type: 'number' },
            min: { type: 'number' },
            average: { type: 'number' }
          },
          required: ['sum', 'count', 'max', 'min', 'average']
        }
      }
    }
  }
);
// Returns: { sum: 438, count: 5, max: 95, min: 78, average: 87.6 }
```

## API

### `reduce(list, instructions, config)`

**Parameters:**
- `list` (Array): Items to reduce
- `instructions` (string): Transformation instructions for accumulation
- `config` (Object): Configuration options
  - `initial` (*): Initial accumulator value
  - `responseFormat` (Object): JSON schema for structured outputs
  - `batchSize` (number): Items per batch (auto-calculated from model context window)
  - `listStyle` (string): Input format style ('auto', 'newline', 'xml')
  - `autoModeThreshold` (number): Character threshold for auto XML mode
  - `maxAttempts` (number): Retry attempts per LLM call (default: 3)
  - `onProgress` (function): Progress callback
  - `abortSignal` (AbortSignal): Signal to cancel the operation
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<*> - Final accumulated value (type depends on instructions and responseFormat)

## Per-Item Mode

Use `reduce.with()` to create a step function compatible with `p-reduce` and similar async utilities:

```javascript
import reduce from './index.js';
import pReduce from 'p-reduce';

const step = reduce.with('sum the values');
const total = await pReduce(items, step, 0);
```

