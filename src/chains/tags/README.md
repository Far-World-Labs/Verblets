# tags

Categorize items against a controlled vocabulary using AI-interpreted tagging rules.

## Example

```javascript
import { tagItem, mapTags } from '@far-world-labs/verblets';

const vocabulary = {
  tags: [
    { id: 'food', label: 'Food & Dining', description: 'Groceries, restaurants' },
    { id: 'transport', label: 'Transportation', description: 'Gas, rideshare, transit' },
    { id: 'housing', label: 'Housing', description: 'Rent, utilities, maintenance' },
  ],
};

// Single item
const tags = await tagItem(
  { description: 'Whole Foods Market', amount: 87.43 },
  { text: 'Categorize by expense type', vocabulary }
);
// => ['food']

// Batch — generates spec once, applies across list
const allTags = await mapTags(expenses, { text: 'Categorize by expense type', vocabulary });
// => [['food'], ['transport'], ['housing', 'transport'], ...]
```

## API

### `tagItem(item, instructions, config?)` — tag a single item

### `mapTags(list, instructions, config?)` — tag multiple items in batches

Instructions can be a string or a bundle. Vocabulary is required in the bundle:

```javascript
// String — vocabulary must be in the bundle
await tagItem(item, { text: 'Categorize expenses', vocabulary });

// Bundle with pre-built spec (skips spec generation)
await tagItem(item, { spec: mySpec, vocabulary });

// From tagInstructions builder
await tagItem(item, tagInstructions({ spec, vocabulary }));
```

### `knownTexts`: `['spec', 'vocabulary', 'vocabularyMode']`

- **spec** — pre-generated tag specification (skips `tagSpec` call)
- **vocabulary** — `{ tags: [...] }` with available tag definitions
- **vocabularyMode** — `'strict'` (default, only vocabulary tags) or `'open'` (may suggest new tags)

### Other exports

- `tagSpec(instructions, config)` — generate reusable tagging specification
- `tagInstructions({ spec, vocabulary, vocabularyMode?, text?, ...context })` — build instruction bundle
