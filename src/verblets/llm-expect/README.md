# LLM Expect

Make intelligent assertions using natural language. A single LLM call that validates content based on meaning, intent, and context.

## Usage

```javascript
import llmExpect from './index.js';

// Simple equality check (throws on failure)
await llmExpect("hello", "hello");
// ✅ Passes silently

// Constraint-based validation
await llmExpect(
  "Hello world!",
  "Is this a greeting?"
);
// ✅ Passes silently

// Failed assertion throws
try {
  await llmExpect("goodbye", "hello");
} catch (error) {
  console.log(error.message);
  // "LLM assertion failed: Does the actual value strictly equal the expected value?"
}

// Disable throwing with config
const result = await llmExpect("goodbye", "hello", undefined, { throw: false });
console.log(result); // false
```

## API

### `llmExpect(actual, expected, constraint?, options?)`

**Parameters:**
- `actual` - The value to test
- `expected` - Expected value (optional if using constraint)
- `constraint` - Natural language constraint (optional)
- `options` - Configuration object
  - `throw` - Whether to throw on failure (default: `true`)

**Returns:**
- `boolean` - True if assertion passes, false if it fails and `throw: false`

**Throws:**
- `Error` - When assertion fails and `throw` is not `false`

## Examples

### Content Quality
```javascript
// Validate AI-generated content
await llmExpect(
  generatedText,
  "Is this text professional and grammatically correct?"
);
```

### Data Validation
```javascript
// Check if data makes sense
await llmExpect(
  { name: "John", age: 25, city: "New York" },
  "Does this person data look realistic?"
);
```

### Business Logic
```javascript
// Validate decisions
await llmExpect(
  recommendation,
  "Is this recommendation specific and actionable?"
);
```

### Non-throwing Usage
```javascript
// Use in conditional logic
const isValid = await llmExpect(
  userInput,
  "Is this input appropriate for children?",
  undefined,
  { throw: false }
);

if (isValid) {
  processInput(userInput);
} else {
  showWarning();
}
```

## Best Practices

- **Be specific**: Use clear, detailed constraints
- **Single purpose**: Each assertion should test one thing
- **Error handling**: Wrap in try-catch when using default throwing behavior
- **Performance**: Remember this makes an LLM call - use judiciously

For advanced features like debugging advice and environment variable modes, see the [llm-expect chain](../../chains/llm-expect/).