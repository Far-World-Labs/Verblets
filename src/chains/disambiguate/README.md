# disambiguate

Resolve ambiguous terms by finding all possible meanings and scoring them against a given context. Returns the best-matching meaning along with all discovered meanings.

## Usage

```javascript
import disambiguate from './index.js';

const result = await disambiguate({
  term: 'bank',
  context: 'fishing by the river',
});

// Returns: {
//   meaning: 'The sloping land alongside a body of water',
//   meanings: [
//     'The sloping land alongside a body of water',
//     'A financial institution that accepts deposits',
//     'A supply or stock held in reserve',
//   ]
// }
```

## API

### `disambiguate({ term, context, ...config })`

**Parameters** (single object):
- `term` (string): The ambiguous term to disambiguate
- `context` (string): Context to score meanings against
- `llm` (string|Object): LLM model configuration (default: `'fastGoodCheap'`)
- `onProgress` (Function): Progress callback

**Returns:** Promise<{ meaning: string, meanings: string[] }> - Best matching meaning and all discovered meanings

### `getMeanings(term, config)`

Exported helper that extracts all distinct meanings of a term via LLM.

**Returns:** Promise<string[]> - Array of distinct meanings
