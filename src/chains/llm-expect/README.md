# LLM Expect Chain

Advanced intelligent assertions with debugging features, environment variable modes, and structured results. This chain provides enhanced functionality beyond the basic [llm-expect verblet](../../verblets/llm-expect/).

## Why Use the Chain?

While the verblet provides simple pass/fail assertions, the chain offers:

- **Advanced Debugging**: Automatic code context analysis and intelligent advice
- **Environment Modes**: Different behaviors for development, testing, and CI
- **Structured Results**: Detailed information about assertions and failures
- **Stack Trace Integration**: Automatic detection of calling file and line

## Environment Variable Modes

Control behavior with the `LLM_EXPECT_MODE` environment variable:

### `none` (default)
Silent mode - returns structured results without throwing or logging
```bash
export LLM_EXPECT_MODE=none
```

### `info` 
Development mode - logs failures with context and advice to console
```bash
export LLM_EXPECT_MODE=info
```

### `error`
CI/Testing mode - throws detailed errors on assertion failures
```bash
export LLM_EXPECT_MODE=error
```

## API Reference

### Enhanced API: `expect(actual, expected?, constraint?)`

Returns a tuple `[passed, details]` with structured results:

```javascript
import { expect } from './index.js';

const [passed, details] = await expect(
  actualValue,
  "Does this meet our quality standards?"
);

console.log(details);
/* Returns:
{
  passed: false,
  advice: "ISSUE: Content lacks specific examples...",
  file: "/path/to/test.js",
  line: 42
}
*/
```

### Simple API: `llmExpect(actual, expected?, constraint?)`

Backward compatible with the verblet - returns boolean:

```javascript
import llmExpect from './index.js';

const result = await llmExpect("hello", "hello");
// Returns: true
```

## Real-World Use Cases

### Content Quality Assurance with Debugging

```javascript
import { expect } from './index.js';

// Set development mode for detailed feedback
process.env.LLM_EXPECT_MODE = 'info';

const [passed, details] = await expect(
  generatedCopy,
  "Is this marketing copy professional, engaging, and free of grammatical errors?"
);

if (!passed) {
  console.log(`Failed at ${details.file}:${details.line}`);
  console.log(details.advice);
  // ISSUE: Copy contains informal language and lacks call-to-action
  // FIX: Replace casual phrases with professional alternatives and add clear CTA
  // CONTEXT: Marketing copy should maintain professional tone while being engaging
}
```

## Advanced Features

### Automatic Code Context Analysis

The chain automatically:
- Detects the calling file and line number
- Reads 400 lines before and 100 lines after the assertion
- Provides this context to the LLM for better debugging advice

### Intelligent Advice Generation

Failed assertions generate structured advice:
- **ISSUE**: Brief description of why the assertion failed
- **FIX**: Specific actionable steps to resolve the issue  
- **CONTEXT**: Additional context about the problem and root causes

### Environment-Aware Behavior

Different modes for different environments:
- **Development**: Rich console output with advice
- **Testing**: Detailed error throwing for CI/CD
- **Production**: Silent operation with structured results

## Best Practices

### **Write Specific Constraints**
```javascript
// ❌ Vague
await expect(text, "Is this good?");

// ✅ Specific  
await expect(text, "Is this text grammatically correct, under 100 words, and written in a professional tone?");
```

### **Use Structured Results**
```javascript
const [passed, details] = await expect(content, constraint);

// Access rich debugging information
console.log('File:', details.file);
console.log('Line:', details.line);
console.log('Advice:', details.advice);
```

### **Combine with Traditional Tests**
```javascript
// Traditional assertion for structure
expect(response).toHaveProperty('status');
expect(response.status).toBe(200);

// LLM assertion for content quality
const [passed] = await llmExpect(
  response.message,
  "Is this error message helpful and user-friendly?"
);
```

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
