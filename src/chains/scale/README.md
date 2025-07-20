# scale

Create custom scaling functions that transform inputs using conceptual reasoning about both the supplied values and their context. The scale can apply subjective judgments, understand relationships between factors, and make nuanced evaluations that go beyond simple mathematical mappings. Supports linear and non-linear transformations, multi-factor evaluations, conditional logic, and dynamic adjustments based on context.

## Usage

```javascript
const confidenceScale = scale('Convert confidence descriptions to 0-1 scores');
await confidenceScale('very confident'); // 0.9
await confidenceScale('somewhat unsure'); // 0.3

// Create an affordability scale
const affordabilityScale = scale(`
Sample price data in NDJSON:
{"price": 10, "category": "budget"}
{"price": 50, "category": "standard"}
{"price": 200, "category": "premium"}
{"price": 1000, "category": "luxury"}

Create an affordability scale from 0-1 where:
- 1.0 = very affordable (under $20)
- 0.5 = moderately affordable ($50-100)
- 0.0 = not affordable (over $500)

Use inverse relationship - higher prices = lower affordability scores.
`);

await affordabilityScale({ price: 15 });  // 0.92
await affordabilityScale({ price: 75 });  // 0.48
await affordabilityScale({ price: 800 }); // 0.05
```

## Collection Processing

Scale integrates with collection utilities for batch processing:

```javascript
import map from '../map/index.js';

const items = ['very confident', 'somewhat unsure', 'absolutely certain'];
const confidenceScale = scale('Convert confidence descriptions to 0-1 scores');
const scores = await map(items, confidenceScale);
// [0.9, 0.3, 1.0]

// With calibration examples
const priorities = ['critical', 'high', 'medium', 'low', 'trivial'];
const priorityScale = scale(`
Scale priority levels to numeric urgency scores (0-100):
- critical = 90-100 (immediate action required)
- high = 70-89 (urgent, within 24h)
- medium = 40-69 (important, this week)
- low = 20-39 (nice to have)
- trivial = 0-19 (backlog)
`);
const priorityScores = await map(priorities, priorityScale);
```

## Advanced Collection Operations

### Filter by Scale

```javascript
import filter from '../filter/index.js';
import { filterInstructions } from './index.js';

// Filter items based on scaled values
const tasks = [
  { name: 'Fix critical bug', priority: 'critical' },
  { name: 'Update docs', priority: 'low' },
  { name: 'New feature', priority: 'medium' }
];

const urgentTasks = await filter(tasks, await filterInstructions({
  scaling: 'Convert priority to urgency score 0-100',
  processing: 'Keep items with urgency score above 70'
}));
```

### Find by Scale

```javascript
import find from '../find/index.js';
import { findInstructions } from './index.js';

// Find the best match based on scaling
const candidates = ['junior', 'mid-level', 'senior', 'principal'];
const bestFit = await find(candidates, await findInstructions({
  scaling: 'Scale developer levels by years of experience typically required',
  processing: 'Find the level closest to 7 years experience'
}));
```

### Group by Scale

```javascript
import group from '../group/index.js';
import { groupInstructions } from './index.js';

// Group items by scaled ranges
const products = [
  { name: 'Widget A', price: 15 },
  { name: 'Widget B', price: 150 },
  { name: 'Widget C', price: 1500 }
];

const priceGroups = await group(products, await groupInstructions({
  scaling: 'Scale prices to affordability categories',
  processing: 'Group into budget (<$50), standard ($50-500), premium (>$500)'
}));
```

## Supporting Utilities

The scale module also exports utilities for advanced use cases:

### createScale

For applications requiring a pre-generated specification:

```javascript
import { createScale, scaleSpec } from './index.js';

// Generate a specification once
const spec = await scaleSpec('Map star ratings (1-5) to quality percentages (0-100)');

// Create a scale function with the specification
const qualityScale = createScale(spec);

// Use the scale function consistently
await qualityScale({ stars: 3 }); // 50
await qualityScale({ stars: 5 }); // 100
await qualityScale({ stars: 1 }); // 0

// Inspect the specification
console.log(qualityScale.specification);
// {
//   domain: "Star ratings from 1 to 5 (integers)",
//   range: "Quality percentages from 0 to 100",
//   mapping: "Linear transformation where 1 star = 0%, 5 stars = 100%..."
// }
```

### Manual Specification Management

For complete control over scale specifications:

```javascript
import { scaleSpec, applyScale } from './index.js';

// Generate a specification independently
const spec = await scaleSpec('Convert sentiment scores (-1 to 1) to emoji');

// Save it for later use (e.g., to database)
await saveToDatabase('sentiment-scale', spec);

// Apply the specification to inputs
const result = await applyScale(0.8, spec); // "😊"
```

## API Reference

### Default Export: `scale(prompt, config)`

Creates a stateless scaling function based on natural language instructions.

**Parameters**
- `prompt` (string): Natural language description of the scaling behavior
- `config` (Object): Configuration options
  - `llm` (Object): LLM configuration

**Returns**
- `Function`: An async function that accepts any input and returns the scaled value


### `scaleSpec(prompt, config)`

Generates a scale specification from instructions.

**Parameters**
- `prompt` (string): Scaling instructions
- `config` (Object): Configuration options

**Returns**
- `Promise<Object>`: A specification object with:
  - `domain`: Description of expected inputs
  - `range`: Description of possible outputs
  - `mapping`: Description of transformation logic

### `applyScale(item, specification, config)`

Applies a scale transformation using an explicit specification.

**Parameters**
- `item` (any): The value to transform
- `specification` (Object): A scale specification from `scaleSpec`
- `config` (Object): Configuration options

**Returns**
- `Promise<any>`: The scaled value

### `createScale(specification, config)`

Creates a scale function with a pre-generated specification.

**Parameters**
- `specification` (Object): A pre-generated scale specification from `scaleSpec`
- `config` (Object): Configuration options

**Returns**
- `Function`: An async function that applies the specification to scale inputs

### Collection Instruction Builders

These functions create instructions for use with collection utilities:

- `mapInstructions(instructions, config)` - Create instructions for map operations
- `filterInstructions({ scaling, processing }, config)` - Create instructions for filter operations
- `findInstructions({ scaling, processing }, config)` - Create instructions for find operations
- `groupInstructions({ scaling, processing }, config)` - Create instructions for group operations
- `reduceInstructions({ scaling, processing }, config)` - Create instructions for reduce operations

Each returns a string with an attached `specification` property for introspection.