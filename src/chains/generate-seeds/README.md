# Generate Seeds Chain

A cognitive science-based seed generation chain that creates diverse, representative items for a given category.

## Features

- **Cognitive Science Foundation**: Uses prototype theory and family resemblance principles
- **Diversity Control**: Configurable diversity levels (focused, balanced, high)
- **Context Awareness**: Supports contextual constraints for targeted generation
- **Robust Retry Logic**: Built-in retry mechanisms for reliable generation
- **Scalable Architecture**: Leverages the list chain infrastructure for efficient processing

## Usage

### Basic Usage

```javascript
import generateSeeds from './src/chains/generate-seeds/index.js';

// Generate basic fruit seeds
const fruitSeeds = await generateSeeds('fruit', {
  count: 5,
  diversityLevel: 'balanced'
});
// Result: ['apple', 'orange', 'durian', 'banana', 'kiwi']
```

### With Context

```javascript
// Generate contextually relevant seeds
const birdSeeds = await generateSeeds('bird', {
  context: 'Common backyard birds in North America',
  count: 4,
  diversityLevel: 'focused'
});
// Result: ['robin', 'cardinal', 'blue jay', 'sparrow']
```

### High Diversity Generation

```javascript
// Generate diverse vehicle types
const vehicleSeeds = await generateSeeds('vehicle', {
  count: 6,
  diversityLevel: 'high'
});
// Result: ['car', 'bicycle', 'helicopter', 'submarine', 'skateboard', 'spaceship']
```

## API Reference

### `generateSeeds(categoryName, options)`

Generates seed items for a specified category using cognitive science principles.

#### Parameters

- **`categoryName`** (string, required): The category name for which to generate seeds
- **`options`** (object, optional): Configuration options

#### Options

- **`count`** (number, default: 10): Number of seed items to generate
- **`context`** (string, default: ''): Additional context to guide generation
- **`diversityLevel`** (string, default: 'balanced'): Controls diversity of generated items
  - `'focused'`: Emphasizes highly typical items
  - `'balanced'`: Mix of typical and moderately typical items
  - `'high'`: Includes atypical and edge-case items
- **`llm`** (string, default: 'fastGoodCheap'): LLM model to use for generation
- **`maxRetries`** (number, default: 3): Maximum retry attempts on failure
- **`retryDelay`** (number, default: 1000): Delay between retries in milliseconds

#### Returns

Promise that resolves to an array of strings representing the generated seed items.

#### Throws

- **Error**: If `categoryName` is not a non-empty string
- **Error**: If no seed items are generated after all retry attempts

## Diversity Levels

### Focused
- Emphasizes highly typical category members
- Suitable for prototype research
- Example: For 'fruit' → ['apple', 'orange', 'banana']

### Balanced (Default)
- Mix of typical and moderately typical items
- Good for general-purpose seed generation
- Example: For 'fruit' → ['apple', 'mango', 'grape', 'kiwi']

### High
- Includes atypical and edge-case items
- Useful for comprehensive category coverage
- Example: For 'fruit' → ['apple', 'durian', 'tomato', 'rhubarb']