# reduce

Accumulate a result across a collection by processing items in batches. Each batch sees the current accumulator and folds the next items into it, so the AI maintains running context throughout.

```javascript
import { reduce } from '@far-world-labs/verblets';

const witnessStatements = [
  'I saw a red car run the light at approximately 3:15 PM.',
  'The vehicle was dark-colored, maybe maroon. It was speeding.',
  'A red sedan hit the pedestrian. The driver stopped briefly then fled.',
  'I didn\'t see the accident but heard tires screech and a loud impact.',
  'The car had a dented front bumper and partial plate starting with 7J.'
];

const summary = await reduce(
  witnessStatements,
  'Synthesize these witness statements into a single coherent account. Resolve contradictions by noting agreement levels. Preserve all unique details.',
  { initial: 'No statements processed yet.' }
);
// => "A red or dark maroon sedan ran a red light at approximately 3:15 PM
//     while speeding. The vehicle struck a pedestrian, and the driver stopped
//     briefly before fleeing the scene. The car had a dented front bumper
//     with a partial license plate beginning with '7J'. One witness heard
//     but did not see the collision. All visual witnesses agree on the color
//     (red to maroon) and the running of the light."
```

For structured accumulation, pass a `responseFormat` JSON schema — the accumulator will be an object instead of a string.

## API

### `reduce(list, instructions, config?)`

- **list** (Array): Items to reduce
- **instructions** (string): How to fold each batch into the accumulator
- **config.initial** (*): Initial accumulator value
- **config.responseFormat** (Object): JSON schema for structured accumulation
- **config.batchSize** (number): Items per batch (auto-calculated from model context window)
- **config.maxAttempts** (number): Retry attempts per batch (default: 3)
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<*>` — Final accumulated value (type depends on instructions and responseFormat)

## Per-Item Mode

Use `reduce.with()` to create a step function compatible with `p-reduce` and similar async utilities:

```javascript
import { reduce } from '@far-world-labs/verblets';
import pReduce from 'p-reduce';

const step = reduce.with('sum the values');
const total = await pReduce(items, step, 0);
```

