# intersections

Find overlapping elements and relationships between multiple categories using AI-powered analysis with intelligent reasoning about commonalities and shared characteristics.

## Usage

```javascript
import intersections from './index.js';

const categories = ['technology', 'healthcare', 'sustainability'];
const results = await intersections(categories, {
  instructions: 'Find innovations and solutions that exist in all these areas'
});

// Returns:
// {
//   'technology + healthcare': {
//     combination: ['technology', 'healthcare'],
//     description: 'Digital health solutions and medical technology',
//     elements: ['Electronic health records', 'Telemedicine platforms', 'Medical imaging AI']
//   },
//   'technology + sustainability': {
//     combination: ['technology', 'sustainability'],
//     description: 'Green technology and environmental solutions',
//     elements: ['Smart grid systems', 'Electric vehicle charging', 'Solar panel monitoring']
//   },
//   'healthcare + sustainability': {
//     combination: ['healthcare', 'sustainability'],
//     description: 'Sustainable healthcare practices',
//     elements: ['Green hospital design', 'Eco-friendly medical supplies', 'Waste reduction programs']
//   },
//   'technology + healthcare + sustainability': {
//     combination: ['technology', 'healthcare', 'sustainability'],
//     description: 'Sustainable digital health innovations',
//     elements: ['Carbon-neutral data centers for health apps', 'Biodegradable medical sensors', 'AI-optimized energy use in hospitals']
//   }
// }
```

## Features

- **Exhaustive Combination Generation**: Automatically generates all possible combinations within specified size ranges
- **Parallel Processing**: Processes multiple combinations simultaneously with configurable batch sizes
- **Dual Analysis**: Combines intersection finding with commonality analysis for comprehensive results
- **JSON Schema Validation**: Optional structured output validation for consistent results

## API

### `intersections(categories, config)`

**Parameters:**
- `categories` (Array): Array of categories to find intersections between
- `config` (Object): Configuration options
  - `instructions` (string): Custom instructions for intersection finding
  - `minSize` (number): Minimum combination size (default: 2)
  - `maxSize` (number): Maximum combination size (default: categories.length)
  - `batchSize` (number): Number of combinations to process in parallel (default: 10)
  - `llm` (Object): LLM model options

**Returns:** Promise<Object> - Object with combination keys and intersection details

## Use Cases

### Market Research
```javascript
import intersections from './index.js';

const markets = ['fitness', 'technology', 'social media'];
const opportunities = await intersections(markets, {
  instructions: 'Find business opportunities and product ideas'
});

// Discovers intersection opportunities like fitness apps, social fitness platforms, etc.
```
