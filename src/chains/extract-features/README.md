# extract-features

Extract multiple features from items in parallel using map operations.

## Usage

```javascript
import extractFeatures from '@far-world-labs/verblets/chains/extract-features';
import map from '@far-world-labs/verblets/chains/map';
import { scoreSpec, mapInstructions as scoreMapInstructions } from '@far-world-labs/verblets/chains/score';

// Define features to extract
const sentimentSpec = await scoreSpec('sentiment positivity (0-10)');
const features = [
  {
    name: 'sentiment',
    operation: (items, config) => map(
      items, 
      scoreMapInstructions({ specification: sentimentSpec }), 
      config
    )
  },
  {
    name: 'category',
    operation: (items, config) => map(
      items,
      'Categorize as: news, opinion, advertisement, or other',
      config
    )
  }
];

// Extract features from items
const articles = [
  "Breaking: Major tech company announces layoffs",
  "Why you should invest in gold now - limited time offer!",
  "Editorial: The importance of climate action"
];

const results = await extractFeatures(articles, features);
// Returns: [
//   { sentiment: 2, category: 'news' },
//   { sentiment: 7, category: 'advertisement' },
//   { sentiment: 6, category: 'opinion' }
// ]
```

## API

### extractFeatures(items, features, config)

- `items` - Array of items to process
- `features` - Array of feature definitions:
  - `name` - Property name for the extracted value
  - `operation` - Function that takes (items, config) and returns array of values
- `config` - Optional configuration passed to feature operations

## Design Notes

Features are processed sequentially since each operation may involve multiple LLM calls and is already internally optimized for parallelism. This prevents overwhelming the system when extracting many features.

The module composes existing chains (map, score, etc.) rather than implementing its own LLM logic, making it easy to extend with new feature types.