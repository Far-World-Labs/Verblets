# tags

Categorize items against a controlled vocabulary using AI-interpreted tagging rules.

## Example

```javascript
import tags, { createTagger } from './index.js';

const expenseVocabulary = {
  tags: [
    { id: 'food', label: 'Food & Dining', description: 'Groceries, restaurants' },
    { id: 'transport', label: 'Transportation', description: 'Gas, rideshare, transit' },
    { id: 'housing', label: 'Housing', description: 'Rent, utilities, maintenance' }
  ]
};

const tagger = tags('Categorize by expense type');
const result = await tagger(
  { description: 'Whole Foods Market', amount: 87.43 },
  expenseVocabulary
);
// => ['food']

// Vocabulary-bound tagger for repeated use
const expenseTagger = createTagger(expenseVocabulary);
const tags1 = await expenseTagger('Uber ride to airport', 'Categorize by expense type');
// => ['transport']
```

## API

### Default: `tags(instructions, config)` — returns a tagger function requiring vocabulary at call time

### Named exports

- `tagItem(item, instructions, vocabulary, config)` — tag a single item
- `mapTags(list, instructions, vocabulary, config)` — tag multiple items in batches
- `tagSpec(instructions, config)` — generate reusable tagging specification
- `applyTags(item, specification, vocabulary, config)` — apply pre-generated spec
- `createTagger(vocabulary, config)` — vocabulary-bound tagger
- `createTagExtractor(specification, vocabulary, config)` — fixed spec + vocabulary extractor

### Instruction builders (for collection chains)

- `mapInstructions({ specification, vocabulary, processing })`
- `filterInstructions({ specification, vocabulary, processing })`
- `reduceInstructions({ specification, vocabulary, processing })`
- `findInstructions({ specification, vocabulary, processing })`
- `groupInstructions({ specification, vocabulary, processing })`

Only valid tag IDs from the vocabulary are returned.
