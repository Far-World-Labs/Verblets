# tags

Apply vocabulary-based tags to categorize items using flexible tagging rules.

## Usage

```javascript
import tags from './index.js';

// Create a sentiment tagger
const sentimentTagger = tags('Analyze emotional tone and intent');
const result = await sentimentTagger(
  'Your product is amazing! Best purchase ever!',
  sentimentVocabulary
);
// => ['positive', 'praise']

// Tag expense transactions  
const expenseVocabulary = {
  tags: [
    { id: 'food', label: 'Food & Dining', description: 'Groceries, restaurants' },
    { id: 'transport', label: 'Transportation', description: 'Gas, rideshare, transit' },
    { id: 'housing', label: 'Housing', description: 'Rent, utilities' }
  ]
};

const tagger = tags('Categorize by expense type');
const tags = await tagger(
  { description: 'Whole Foods Market', amount: 87.43 },
  expenseVocabulary
);
// => ['food']
```

## Vocabulary Structure

Vocabularies define available tags with metadata:

```javascript
const vocabulary = {
  tags: [
    { 
      id: 'urgent',           // Required: unique identifier  
      label: 'Urgent',        // Display name
      description: 'Needs immediate attention',
      parent: 'priority'      // Optional: for hierarchical tags
    }
  ]
};
```

## Core Functions

### Default Export: `tags(instructions, config)`

Create a stateless tagger requiring vocabulary at call time.

### Named Exports

#### `tagItem(item, instructions, vocabulary, config)`
Tag a single item.

#### `mapTags(list, instructions, vocabulary, config)`
Tag multiple items in batches.

#### `tagSpec(instructions, config)`
Generate reusable tagging specifications.

#### `applyTags(item, specification, vocabulary, config)`
Apply pre-generated specification with vocabulary.

#### `createTagger(vocabulary, config)`
Create vocabulary-bound tagger for consistent categorization.

#### `createTagExtractor(specification, vocabulary, config)`
Create optimized extractor with fixed specification and vocabulary.

## Collection Processing

The tags chain provides instruction builders for collection operations:

```javascript
import map from '../map/index.js';
import { mapInstructions } from './index.js';

const spec = await tagSpec('Product categorization rules');
const tagged = await map(
  products,
  mapInstructions({ specification: spec, vocabulary: productVocab })
);
```

### Instruction Builders

- `mapInstructions({ specification, vocabulary, processing })` - Transform items to tag arrays
- `filterInstructions({ specification, vocabulary, processing })` - Filter by tag criteria  
- `reduceInstructions({ specification, vocabulary, processing })` - Aggregate tag data
- `findInstructions({ specification, vocabulary, processing })` - Find by tag patterns
- `groupInstructions({ specification, vocabulary, processing })` - Group by tags

## Advanced Usage

### Vocabulary-Bound Tagger

```javascript
import { createTagger } from './index.js';

const projectTagger = createTagger(projectVocabulary);

// Works with single items or arrays
const tags1 = await projectTagger(task, 'Identify work type');
const tagsBatch = await projectTagger(tasks, 'Categorize all tasks');
```

### Pre-generated Specifications

```javascript
import { tagSpec, createTagExtractor } from './index.js';

// Generate once
const spec = await tagSpec('Assign priority based on impact and urgency');

// Create reusable extractor
const priorityExtractor = createTagExtractor(spec, priorityVocabulary);

// Use consistently
const priority = await priorityExtractor('Database backup failing');
// => ['p0']

// Access internals
console.log(priorityExtractor.specification);
console.log(priorityExtractor.vocabulary);
```

## Architecture

The tags chain implements a specification-vocabulary pattern:

- **Specifications** define tagging rules and criteria
- **Vocabularies** provide the available tag set
- **Taggers** combine both for consistent categorization

This separation enables reusable tagging logic across different vocabularies and ensures only valid tag IDs from the vocabulary are returned.