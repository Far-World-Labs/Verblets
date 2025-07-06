# detect-patterns

Find recurring patterns in object collections. Automatically identifies common structures, value patterns, and value ranges across the properties of a dataset.

## Usage

```javascript
import detectPatterns from './detect-patterns/index.js';

const patterns = await detectPatterns(objects, {
  topN: 3,           // Return top 3 patterns
  llm: { ... }       // LLM configuration
});
```

## Example: Community Garden Success Stories

Discover what makes community gardens thrive by analyzing successful garden projects.

```javascript
// Data from thriving community gardens worldwide
const successfulGardens = [
  { volunteers: 25, plotSize: 'medium', workshops: 8, harvestYield: 'high', location: 'urban', funding: 'grants' },
  { volunteers: 18, plotSize: 'small', workshops: 12, harvestYield: 'high', location: 'suburban', funding: 'donations' },
  { volunteers: 32, plotSize: 'large', workshops: 6, harvestYield: 'high', location: 'urban', funding: 'grants' },
  { volunteers: 22, plotSize: 'medium', workshops: 10, harvestYield: 'high', location: 'urban', funding: 'mixed' },
  { volunteers: 15, plotSize: 'small', workshops: 15, harvestYield: 'medium', location: 'rural', funding: 'donations' },
  // ... data from hundreds of flourishing gardens
];

const successPatterns = await detectPatterns(successfulGardens, { topN: 3 });

/* Reveals patterns like:
[
  {
    volunteers: { range: [18, 32] },
    plotSize: { values: ['medium', 'large'] },
    workshops: { range: [6, 12] },
    harvestYield: 'high',
    location: 'urban',
    funding: { values: ['grants', 'mixed'] }
  },
  {
    volunteers: { range: [15, 20] },
    plotSize: 'small',
    workshops: { range: [12, 15] },
    harvestYield: { values: ['medium', 'high'] },
    location: { values: ['suburban', 'rural'] },
    funding: 'donations'
  }
]
*/
```

## Parameters

- `objects` - Array of objects to analyze
- `topN` - Maximum patterns to return (default: 5)
- `llm` - Language model configuration

## Returns

Array of pattern objects with templates containing:
- Literal values
- `{ range: [min, max] }` 
- `{ values: [...] }`