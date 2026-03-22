# filter

Keep items from a list that match natural language criteria. The AI evaluates each item against your description and returns only the matches.

```javascript
import { filter } from '@far-world-labs/verblets';

const ingredients = [
  '2 cups all-purpose flour',
  '1 cup almond milk',
  '3 large eggs',
  '½ cup honey',
  '1 tbsp vanilla extract',
  '¼ cup melted butter',
  '1 cup Greek yogurt',
  'pinch of salt'
];

const vegan = await filter(ingredients, 'ingredients that are vegan-friendly');
// => ['2 cups all-purpose flour', '1 cup almond milk', '½ cup honey',
//     '1 tbsp vanilla extract', 'pinch of salt']
```

The AI knows that eggs, butter, and Greek yogurt are animal products even though the words "animal" or "dairy" never appear.

## API

### `filter(array, criteria, config?)`

- **array** (Array): Items to filter
- **criteria** (string): Natural language description of what to keep
- **config.strictness** (`'low'`|`'high'`): Borderline item handling. `'low'` errs on inclusion (keep uncertain items). `'high'` errs on exclusion (drop uncertain items). Default: no guidance
- **config.batchSize** (number): Items per batch (auto-calculated from model context window)
- **config.maxAttempts** (number): Retry attempts per batch (default: 3)
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<Array>` — Items that match the criteria

## Per-Item Mode

`filter.with()` creates a single-item predicate for use with `p-filter` or similar async utilities:

```javascript
import { filter } from '@far-world-labs/verblets';
import pFilter from 'p-filter';

const isVegan = filter.with('vegan-friendly ingredients');
const results = await pFilter(ingredients, isVegan, { concurrency: 5 });
```

