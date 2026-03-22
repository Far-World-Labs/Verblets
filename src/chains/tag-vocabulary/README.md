# tag-vocabulary

Generate and refine tag vocabularies by analyzing sample data. The chain creates an initial vocabulary, applies it to samples, analyzes usage statistics, and iteratively refines until tags have good coverage and balance.

## Example

Bootstrap a tagging system for incident reports — the AI discovers the categories your data actually needs:

```javascript
import tagVocabulary from './index.js';

const incidents = [
  'Production database CPU at 98% for 30 minutes',
  'SSL certificate expired on payment gateway',
  'User reports intermittent 500 errors on checkout',
  'Deployment pipeline stuck, blocking all releases',
  'Memory leak in notification service causing OOM kills'
];

const vocabulary = await tagVocabulary(
  'Create incident tags for severity, affected system, and failure type',
  incidents
);
// => {
//   tags: [
//     { id: 'infrastructure', label: 'Infrastructure', description: 'Server, network, and platform issues' },
//     { id: 'security', label: 'Security', description: 'Certificates, auth, and access issues' },
//     { id: 'application', label: 'Application', description: 'Code-level bugs and errors' },
//     { id: 'pipeline', label: 'CI/CD Pipeline', description: 'Build and deployment failures' },
//     ...
//   ]
// }
```

## API Reference

### `tagVocabulary(spec, samples, config)` (default export)

Generates a complete, refined vocabulary.

- `spec` (string): Tag system specification
- `samples` (Array): Sample items to analyze
- `config` (Object):
  - `tagger` (Function): Custom tagger function (defaults to tags chain)
  - `sampleSize` (number): Items to sample for refinement
  - `llm` (Object): LLM configuration

### `generateInitialVocabulary(spec, samples, config)`

Generates initial vocabulary without refinement.

### `computeTagStatistics(vocabulary, taggedItems, config)`

Analyzes tag usage patterns. Returns `{ stats, mostUsed, leastUsed, problematicItems }` with coverage percentages, tag distribution, and items that are untagged or over-tagged.
