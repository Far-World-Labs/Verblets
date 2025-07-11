# scale

Create custom scaling functions that transform inputs using conceptual reasoning about both the supplied values and their context. The scale can apply subjective judgments, understand relationships between factors, and make nuanced evaluations that go beyond simple mathematical mappings. Supports linear and non-linear transformations, multi-factor evaluations, conditional logic, and dynamic adjustments based on context. Returns a reusable function that consistently applies your complex scaling logic.

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

## API Reference

### `scale(prompt, config)`

Creates a scaling function based on natural language instructions.

**Parameters**

- `prompt` (string): Natural language description of the scaling behavior, including sample mappings, ranges, and rules
- `config` (Object, optional): Configuration options
  - `model` (string): LLM model to use
  - `temperature` (number): Response randomness (0-2)
  - `maxTokens` (number): Maximum response length

**Returns**

- `Function`: An async function that accepts any input and returns the scaled value