# Category Samples Chain

Generate diverse, representative examples for any category. This chain applies prototype theory and related cognitive science principles to output a well-rounded set of sample items.

## Features

- **Cognitive Science Foundation**: Uses prototype theory and family resemblance principles
- **Diversity Control**: Configurable diversity levels (focused, balanced, high)
- **Context Awareness**: Supports contextual constraints for targeted generation
- **Robust Retry Logic**: Built-in retry mechanisms for reliable generation
- **Scalable Architecture**: Leverages the list chain infrastructure for efficient processing

## Usage

### Basic Usage

```javascript
import categorySamples from './src/chains/category-samples/index.js';

// Generate basic fruit samples
const fruitSamples = await categorySamples('fruit', {
  count: 5,
  diversityLevel: 'balanced'
});
// Result: ['apple', 'orange', 'durian', 'banana', 'kiwi']
```

### With Context

```javascript
// Generate contextually relevant samples
const birdSamples = await categorySamples('bird', {
  context: 'Common backyard birds in North America',
  count: 4,
  diversityLevel: 'focused'
});
// Result: ['robin', 'cardinal', 'blue jay', 'sparrow']
```

### High Diversity Generation

```javascript
// Generate diverse vehicle types
const vehicleSamples = await categorySamples('vehicle', {
  count: 6,
  diversityLevel: 'high'
});
// Result: ['car', 'bicycle', 'helicopter', 'submarine', 'skateboard', 'spaceship']
```

## API Reference

### `categorySamples(categoryName, options)`

Returns an array of sample items for the given category. Options let you control diversity, add context, and configure retry logic.

**Common Options**

- `count` (number): How many samples to return (default: 10)
- `context` (string): Extra context to guide generation
- `diversityLevel` ('focused' | 'balanced' | 'high'): Adjusts how typical or atypical the samples are
