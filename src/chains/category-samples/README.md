# category-samples

Generate diverse, representative examples for any category using prototype theory and cognitive science principles.

For single category classification, use the [categorize](../../verblets/categorize) verblet.

## Basic Usage

```javascript
import categorySamples from './index.js';

const fruits = await categorySamples('fruit', {
  count: 5,
  diversityLevel: 'balanced'
});

// Returns: ['apple', 'orange', 'durian', 'banana', 'kiwi']
```

## Parameters
<<<<<<< HEAD
=======

- **categoryName** (string): The category to generate samples for
- **options** (Object): Configuration options
  - **count** (number): Number of samples to generate (default: 10)
  - **diversityLevel** (string): Sample diversity - 'focused', 'balanced', or 'high' (default: 'balanced')
  - **context** (string): Additional context to guide generation (optional)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an array of strings representing diverse examples from the specified category.

## Features

- **Cognitive science foundation**: Uses prototype theory for representative sampling
- **Configurable diversity**: Control from typical examples to edge cases
- **Context-aware generation**: Supports contextual constraints for targeted results
- **Batch processing**: Efficient generation using chain infrastructure

## Use Cases

- Creating test data for category-based algorithms
- Generating examples for educational content
- Building diverse datasets for machine learning
- Brainstorming sessions for creative projects

## Advanced Usage
>>>>>>> origin/main

- **categoryName** (string): The category to generate samples for
- **options** (Object): Configuration options
  - **count** (number): Number of samples to generate (default: 10)
  - **diversityLevel** (string): Sample diversity - 'focused', 'balanced', or 'high' (default: 'balanced')
  - **context** (string): Additional context to guide generation (optional)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an array of strings representing diverse examples from the specified category.

## Use Cases

### Creating Test Data
```javascript
// Generate contextually relevant samples
const backyardBirds = await categorySamples('bird', {
  context: 'Common backyard birds in North America',
  count: 4,
  diversityLevel: 'focused'
});
// Returns: ['robin', 'cardinal', 'blue jay', 'sparrow']

// Generate highly diverse samples
const vehicles = await categorySamples('vehicle', {
  count: 6,
  diversityLevel: 'high'
});
// Returns: ['car', 'bicycle', 'helicopter', 'submarine', 'skateboard', 'spaceship']
```

## API Reference

### `categorySamples(categoryName, options)`

Returns an array of sample items for the given category. Options let you control diversity, add context, and configure retry logic.

**Common Options**

- `count` (number): How many samples to return (default: 10)
- `context` (string): Extra context to guide generation
- `diversityLevel` ('focused' | 'balanced' | 'high'): Adjusts how typical or atypical the samples are
