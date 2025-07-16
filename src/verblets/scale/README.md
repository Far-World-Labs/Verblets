# scale

Create custom scaling functions that transform inputs using conceptual reasoning about both the supplied values and their context. The scale can apply subjective judgments, understand relationships between factors, and make nuanced evaluations that go beyond simple mathematical mappings. Supports linear and non-linear transformations, multi-factor evaluations, conditional logic, and dynamic adjustments based on context.

This module provides both simple stateless scaling and advanced stateful scaling with specification generation for maximum consistency and transparency.

## Usage

```javascript
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

## Advanced Usage: Stateful Scaling with `createScale`

For applications requiring consistent scaling across multiple calls, use `createScale` which generates and stores a scale specification:

```javascript
import { createScale } from '@far-world-labs/verblets/scale';

// Create a stateful scale that generates a specification on first use
const qualityScale = createScale('Map star ratings (1-5) to quality percentages (0-100)');

// First call generates and caches the specification
await qualityScale({ stars: 3 }); // 50

// Subsequent calls use the same specification for perfect consistency
await qualityScale({ stars: 5 }); // 100
await qualityScale({ stars: 1 }); // 0

// Inspect the generated specification
console.log(qualityScale.specification);
// {
//   domain: "Star ratings from 1 to 5 (integers)",
//   range: "Quality percentages from 0 to 100",
//   mapping: "Linear transformation where 1 star = 0%, 5 stars = 100%. Formula: percentage = (stars - 1) * 25. Edge Cases: Values outside 1-5 are clamped to range. Examples: 1→0, 3→50, 5→100"
// }
```

## Manual Specification Management

For complete control over scale specifications:

```javascript
import { scaleSpec, applyScale } from '@far-world-labs/verblets/scale';

// Generate a specification independently
const spec = await scaleSpec('Convert sentiment scores (-1 to 1) to emoji');

// Save it for later use (e.g., to database)
await saveToDatabase('sentiment-scale', spec);

// Apply the specification to inputs
const result = await applyScale(0.8, spec); // "😊"
```

## API Reference

### `scale(prompt, config)` (default export)

Creates a stateless scaling function based on natural language instructions.

**Parameters**

- `prompt` (string): Natural language description of the scaling behavior
- `config` (Object, optional): Configuration options
  - `model` (string): LLM model to use
  - `temperature` (number): Response randomness (0-2)
  - `maxTokens` (number): Maximum response length

**Returns**

- `Function`: An async function that accepts any input and returns the scaled value
- Has a `prompt` property for introspection

### `createScale(prompt, config)`

Creates a stateful scaling function that generates and caches a specification.

**Parameters**

- Same as `scale()`

**Returns**

- `Function`: An async function with:
  - `prompt` property: The original instructions
  - `specification` property: The generated specification (null until first use)

### `scaleSpec(prompt, config)`

Generates a scale specification from instructions.

**Parameters**

- Same as `scale()`

**Returns**

- `Promise<Object>`: A specification object with:
  - `domain`: Description of expected inputs
  - `range`: Description of possible outputs
  - `mapping`: Description of transformation logic including examples

### `applyScale(input, specification, config)`

Applies a scale transformation using an explicit specification.

**Parameters**

- `input` (any): The value to transform
- `specification` (Object|string): A scale specification from `scaleSpec` or a string description
- `config` (Object, optional): Configuration options

**Returns**

- `Promise<any>`: The scaled value

## When to Use Each Function

- **`scale`**: Quick transformations, exploration, simple scales
- **`createScale`**: Production apps, complex scales, when consistency matters
- **`scaleSpec` + `applyScale`**: Multi-tenant apps, versioned scales, distributed systems