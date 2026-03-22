# category-samples

Generate representative sample items for a category using cognitive science principles. Creates diverse, representative examples across the typicality spectrum using prototype theory and family resemblance.

## Usage

```javascript
import categorySamples from './index.js';

const fruits = await categorySamples('fruit', { count: 5 });
// Returns: ['apple', 'banana', 'mango', 'dragonfruit', 'fig']

const birds = await categorySamples('bird', {
  context: 'Common backyard birds in North America',
  count: 4,
  diversity: 'low',
});
// Returns: ['robin', 'sparrow', 'cardinal', 'bluejay']
```

## API

### `categorySamples(categoryName, config)`

**Parameters:**
- `categoryName` (string): Name of the category to generate samples for
- `config` (Object): Configuration options
  - `diversity` (`'low'`|`'high'`): Controls sampling strategy. `'low'` focuses on typical, central members with fewer candidates (15). `'high'` spans edge cases and borderline members with more candidates (50). Default: balanced behavior with 30 candidates
  - `count` (number): Override number of sample items to return
  - `context` (string): Context description for generation (default: '')
  - `llm` (string|Object): LLM model configuration (default: `'fastGoodCheap'`)

**Returns:** Promise<string[]> - Array of representative category member names
