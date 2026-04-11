# category-samples

Generate representative items for a category using cognitive science principles. The prompt invokes prototype theory and family resemblance to produce examples across the typicality spectrum — from prototypical members through moderately typical to borderline edge cases.

Internally uses the `list` chain for iterative generation: keeps calling the LLM until enough items are collected, then truncates to the requested count.

```javascript
import { categorySamples } from '@far-world-labs/verblets';

const fruits = await categorySamples('fruit', { diversity: 'high', count: 8 });
// Generates up to 50 candidates with edge cases, returns the first 8:
// ['apple', 'banana', 'dragonfruit', 'tomato', 'avocado', 'olive', 'fig', 'jackfruit']

const birds = await categorySamples('bird', {
  context: 'Common backyard birds in North America',
  diversity: 'low',
});
// Focuses on typical members, generates 15 candidates:
// ['robin', 'sparrow', 'cardinal', 'blue jay', 'finch', ...]
```

## API

### `categorySamples(categoryName, config)`

- `categoryName` (string, required): The category to generate samples for
- `config` (Object):
  - `diversity` (`'low'`|`'high'`): Controls both the prompt framing and how many items are generated before truncation. `'low'` focuses on typical central members (15 items). `'high'` spans edge cases and borderline members (50 items). Default: balanced (30 items).
  - `count` (number): Override the number of items to return (independent of `diversity`)
  - `context` (string): Domain context to guide generation (e.g., "North American species")
  - `llm` (string|Object): LLM configuration. Default: `{ fast: true, good: true, cheap: true }`

**Returns:** `Promise<string[]>` — array of category member names
