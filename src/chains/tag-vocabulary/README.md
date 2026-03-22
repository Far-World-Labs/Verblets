# tag-vocabulary

Generate and refine tag vocabularies through iterative analysis of sample data and usage patterns.

## Usage

```javascript
import tagVocabulary from './index.js';

// Generate vocabulary from samples
const tickets = [
  'Cannot login to account, password reset not working',
  'How do I export my data to CSV?',
  'App crashes when uploading large files',
  'Request for bulk discount pricing',
  'Two-factor authentication not sending codes'
];

const vocabulary = await tagVocabulary(
  `Create support ticket tags for issue type and product area`,
  tickets
);
// => {
//   tags: [
//     { id: 'auth_issue', label: 'Authentication', description: 'Login and access problems' },
//     { id: 'bug', label: 'Bug', description: 'Software defects and crashes' },
//     { id: 'feature_request', label: 'Feature Request', description: 'New functionality' },
//     { id: 'billing', label: 'Billing', description: 'Pricing and payment issues' },
//     { id: 'how_to', label: 'How-To', description: 'Usage questions' }
//   ]
// }
```

## Core Functions

### Default Export: `tagVocabulary(spec, samples, config)`

Generate complete vocabulary with refinement.

**Parameters:**
- `spec` (string): Tag system specification describing desired tags
- `samples` (Array): Sample items to analyze for vocabulary generation
- `config` (Object): Configuration options
  - `tagger` (Function): Custom tagger function (defaults to tags chain)
  - `sampleSize` (number): Items to sample for refinement
  - `llm` (Object): LLM configuration

### `generateInitialVocabulary(spec, samples, config)`

Generate initial vocabulary from specification and samples.

### `computeTagStatistics(vocabulary, taggedItems, config)`

Analyze tag usage patterns with pure statistical computation.

**Returns:**
```javascript
{
  stats: { 
    totalItems: 100,
    taggedItems: 95,
    coveragePercent: 95,
    uniqueTagsUsed: 12,
    avgTagsPerItem: 2.3
  },
  mostUsed: [{ tag: {...}, count: 45, percent: 47.4 }],
  leastUsed: [{ tag: {...}, count: 1, percent: 1.1 }],
  problematicItems: [
    { type: 'untagged', itemIndex: 7, item: '...' },
    { type: 'over-tagged', itemIndex: 23, item: '...', tagCount: 8 }
  ]
}
```

## Iterative Refinement Process

The tag-vocabulary chain follows this workflow:

1. **Generate Initial Vocabulary**: Creates tags from specification and samples
2. **Apply Tags**: Uses the tags chain to tag sample items
3. **Analyze Distribution**: Computes statistics on tag usage
4. **Identify Issues**: Finds over/under-used tags and untagged items
5. **Refine Vocabulary**: Adjusts tags based on usage patterns

## Advanced Usage

### Custom Tagger Integration

```javascript
import { createTagger } from '../tags/index.js';

// Use existing tagger for refinement
const domainTagger = createTagger(existingVocabulary);

const refined = await tagVocabulary(
  'Expand vocabulary for new use cases',
  newSamples,
  { tagger: domainTagger }
);
```

### Statistical Analysis Only

```javascript
import { computeTagStatistics } from './index.js';

// Analyze existing tagged data
const stats = computeTagStatistics(
  vocabulary,
  taggedItems,
  { topN: 5, bottomN: 5 }
);

console.log(`Coverage: ${stats.stats.coveragePercent}%`);
console.log(`Most used: ${stats.mostUsed[0].tag.label}`);
```

### Building on Existing Vocabulary

```javascript
const initialTags = [
  { id: 'bug', label: 'Bug', description: 'Code defect' },
  { id: 'feature', label: 'Feature', description: 'New functionality' }
];

const expandedVocabulary = await generateInitialVocabulary(
  `Expand this vocabulary: ${JSON.stringify(initialTags)}
   Add tags for performance, security, and UX issues`,
  sampleIssues
);
```

## Hierarchical Vocabularies

Support for parent-child tag relationships:

```javascript
const hierarchicalSpec = `Create a two-level tag hierarchy:
  - Top level: Category (frontend, backend, infrastructure)
  - Second level: Specific areas within each category`;

const vocabulary = await tagVocabulary(hierarchicalSpec, samples);
// Tags will include 'parent' field for hierarchy
```

## Configuration

- `tagger`: Function to apply tags (defaults to tags chain)
- `sampleSize`: Number of items to sample for refinement (default: 10)
- `topN`: Number of most-used tags to analyze (default: 5)
- `bottomN`: Number of least-used tags to analyze (default: 5)
- `llm`: LLM configuration object

## Use Cases

1. **Dynamic Taxonomy Creation**: Generate categorization systems from data
2. **Tag System Bootstrap**: Create initial tag sets for new applications
3. **Vocabulary Optimization**: Refine existing tags based on usage
4. **Domain Modeling**: Extract domain concepts as structured tags
5. **Metadata Generation**: Create descriptive tags for content organization