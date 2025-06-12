# LLM Expect

Make intelligent assertions using natural language. A single LLM call that validates content based on meaning, intent, and context.

## Quick Start

```javascript
import expect, { llmAssert } from './index.js';

// Simple equality check (throws on failure)
await expect("hello").toEqual("hello");
// ✅ Passes silently

// Constraint-based validation
await expect("Hello world!").toSatisfy("Is this a greeting?");
// ✅ Passes silently

// Failed assertion throws
try {
  await expect("goodbye").toEqual("hello");
} catch (error) {
  console.log(error.message);
  // "LLM assertion failed: Does the actual value strictly equal the expected value?"
}

// Direct helper with custom options
const passed = await llmAssert({
  actual: "hello",
  equals: "hello",
  llm: { temperature: 0 },
  throws: false,
});

// Custom message when the assertion fails
await expect("bad").toEqual("good", {
  message: ({ actual, equals }) => `Expected ${equals} but got ${actual}`,
});
```

Use `throws: false` to return a boolean instead of throwing when the assertion fails.

## Enhanced Chain Implementation

For advanced debugging, detailed error analysis, and enhanced features, use the **[expect chain](../../chains/expect/)**:

### Environment Modes

```bash
# Silent operation (default)
export LLM_EXPECT_MODE=none

# Log debugging advice on failures
export LLM_EXPECT_MODE=info

# Throw with detailed debugging advice
export LLM_EXPECT_MODE=error
```

## Best Practices

- **Be specific**: Use clear, detailed constraints
- **Test qualitatively**: Verify qualitative details with a clear yes/no answer
- **Use robust constraints**: Write criteria to pass under a wide range of input hallucinations. Assert cases that classical software can't. Tune the level of rigorousness to the model performing the eval.
- **Performance**: Remember this makes an LLM call - use judiciously
