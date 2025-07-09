# score

Score items on a 0-10 scale with automatic calibration for consistent results across batches.

## Usage

```javascript
import score from './index.js';

const products = [
  'Premium wireless headphones with noise cancellation',
  'Basic earbuds',
  'Professional studio monitors with balanced inputs',
  'Bluetooth speaker'
];

const { scores } = await score(products, 'audio quality and professional features');
// => { scores: [8, 3, 9, 5], reference: [...] }
```

## API

### `score(list, instructions, config)`

Scores a list of items based on given criteria with automatic calibration.

**Parameters:**
- `list` (Array<string>): Items to score
- `instructions` (string): Scoring criteria description
- `config` (Object): Configuration options
  - `chunkSize` (number): Items per batch (default: 10)
  - `examples` (Array): Pre-scored reference examples
  - `llm` (Object): LLM configuration
  - `stopOnThreshold` (number): Stop scoring when item scores below threshold

**Returns:** Promise<Object>
- `scores` (Array<number>): Scores from 0-10 for each item
- `reference` (Array): Calibration examples used
- `stoppedAt` (number): Index where scoring stopped (if threshold used)

## How It Works

1. **Initial Scoring**: Scores items in batches
2. **Calibration Selection**: Picks low, medium, and high scoring examples
3. **Rescoring**: Scores calibration examples again for consistency
4. **Final Pass**: Scores all items with calibration reference

This two-pass approach ensures consistent scoring across large lists.

## Examples

### Content Quality
```javascript
const articles = await loadArticles();
const { scores } = await score(
  articles.map(a => a.title + ': ' + a.summary),
  'engaging content with clear value proposition'
);
const topArticles = articles.filter((_, i) => scores[i] >= 7);
```

### Resume Screening
```javascript
const resumes = await parseResumes();
const { scores } = await score(
  resumes.map(r => r.experience + ' ' + r.skills),
  'match for senior JavaScript developer role',
  { chunkSize: 20 }
);
```

### Priority Ranking
```javascript
const features = ['Dark mode', 'Export to PDF', 'Real-time sync', 'Emoji support'];
const { scores } = await score(features, 'impact on user experience');
features.sort((a, b) => scores[features.indexOf(b)] - scores[features.indexOf(a)]);
```

### Early Termination
```javascript
// Stop scoring when quality drops below threshold
const { scores, stoppedAt } = await score(
  searchResults,
  'relevance to query',
  { stopOnThreshold: 4 }
);
// Only process results up to stoppedAt
```

## Best Practices

- Write clear, specific scoring instructions
- Use consistent formatting for similar items
- Larger chunk sizes (20-30) work well for simple comparisons
- Smaller chunks (5-10) better for complex evaluations
- Pre-scored examples improve consistency for domain-specific scoring