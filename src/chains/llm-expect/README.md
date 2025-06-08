# LLM Expect Chain

Advanced intelligent assertions with debugging features, environment variable modes, and structured results. This chain provides enhanced functionality beyond the basic [llm-expect verblet](../../verblets/llm-expect/).

## Why Use the Chain?

While the verblet provides simple pass/fail assertions, the chain offers:

- **🔍 Advanced Debugging**: Automatic code context analysis and intelligent advice
- **🎛️ Environment Modes**: Different behaviors for development, testing, and CI
- **📊 Structured Results**: Detailed information about assertions and failures
- **🎯 Stack Trace Integration**: Automatic detection of calling file and line

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

### 🎯 Content Quality Assurance with Debugging

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

### 📧 Email Template Validation

```javascript
// CI mode - fail fast with detailed errors
process.env.LLM_EXPECT_MODE = 'error';

try {
  const [passed] = await expect(
    emailTemplate,
    "Does this email sound friendly, professional, and include a clear call-to-action?"
  );
} catch (error) {
  // Detailed error with code context and advice
  console.error(error.message);
  process.exit(1);
}
```

### 🔍 Data Extraction Verification

```javascript
const extractedData = { name: "John Doe", age: 25, city: "New York" };

const [passed, details] = await expect(
  extractedData,
  "Does this person data look realistic and properly formatted?"
);

// Access structured debugging information
if (!passed) {
  console.log('Validation failed:', details.advice);
  console.log('Location:', `${details.file}:${details.line}`);
}
```

### 🎨 Creative Content Review

```javascript
const [passed, details] = await expect(
  generatedStory,
  "Is this story engaging, age-appropriate for teens, and has a clear beginning, middle, and end?"
);

// Use structured results for conditional logic
if (passed) {
  publishStory(generatedStory);
} else {
  requestRevision(details.advice);
}
```

### 🏢 Business Logic Validation

```javascript
const recommendation = "Increase inventory by 15% for Q4";

const [passed, details] = await expect(
  recommendation,
  "Is this business recommendation specific, actionable, and includes a timeframe?"
);

// Detailed analysis available in all modes
console.log('Recommendation analysis:', details);
```

## Integration Examples

### With Vitest

```javascript
import { describe, it, expect as vitestExpect } from 'vitest';
import { expect as llmExpect } from '../chains/llm-expect/index.js';

describe('Content Generation', () => {
  it('should generate professional email responses', async () => {
    const response = await generateEmailResponse(customerInquiry);
    
    const [passed, details] = await llmExpect(
      response,
      "Is this email response professional, helpful, and addresses the customer's concern?"
    );
    
    vitestExpect(passed).toBe(true);
    if (!passed) {
      console.log('Quality issues:', details.advice);
    }
  });
});
```

### With Jest

```javascript
test('AI summary quality with debugging', async () => {
  const summary = await generateSummary(longArticle);
  
  const [passed, details] = await llmExpect(
    summary,
    "Is this summary concise, accurate, and captures the main points?"
  );
  
  expect(passed).toBe(true);
  
  // Access debugging information even on success
  console.log(`Assertion at ${details.file}:${details.line}`);
});
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

### 🎯 **Write Specific Constraints**
```javascript
// ❌ Vague
await expect(text, "Is this good?");

// ✅ Specific  
await expect(text, "Is this text grammatically correct, under 100 words, and written in a professional tone?");
```

### 📊 **Use Structured Results**
```javascript
const [passed, details] = await expect(content, constraint);

// Access rich debugging information
console.log('File:', details.file);
console.log('Line:', details.line);
console.log('Advice:', details.advice);
```

### 🎛️ **Configure for Environment**
```javascript
// Development
process.env.LLM_EXPECT_MODE = 'info';

// CI/CD
process.env.LLM_EXPECT_MODE = 'error';

// Production monitoring
process.env.LLM_EXPECT_MODE = 'none';
```

### 🔄 **Combine with Traditional Tests**
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

## Performance Considerations

- Each assertion makes an LLM call - use judiciously
- Code context analysis reads files from disk
- Advice generation makes additional LLM calls in `info`/`error` modes
- Consider caching strategies for repeated assertions

## Migration from Verblet

The chain is fully backward compatible:

```javascript
// Verblet usage
import llmExpect from '../../verblets/llm-expect/index.js';
const result = await llmExpect(actual, expected);

// Chain usage (same result)
import llmExpect from './index.js';
const result = await llmExpect(actual, expected);

// Enhanced chain usage
import { expect } from './index.js';
const [result, details] = await expect(actual, expected);
``` 