# Example File Guidelines

Example files (`example.js`) serve as **living documentation** that demonstrates real-world usage of verblets and chains. They are structured as Vitest test suites but focus on showcasing practical applications rather than comprehensive testing.

## Purpose

Example files should:
- **Demonstrate real-world usage** - Show how the module solves actual problems
- **Be relatable and compelling** - Use scenarios that users can easily understand
- **Provide immediate value** - Readers should learn something useful from each example
- **Validate functionality** - Ensure the module works as expected in practice

## Structure

### Basic Template

```javascript
import { describe, test, expect } from 'vitest';
import moduleName from './index.js';

describe('Real-World Examples', () => {
  test('should handle common use case', async () => {
    // Setup with realistic data
    const input = 'realistic example input';
    
    // Execute
    const result = await moduleName(input);
    
    // Verify meaningful outcome
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    
    // Optional: Log result for manual inspection
    console.log('Example result:', result);
  });
});
```

## Key Principles

### 1. No Mocking of LLM Calls
- **Always use real LLM interactions** - This validates actual functionality
- **Accept that examples may occasionally fail** - Real AI calls can be unpredictable
- **Use meaningful assertions** - Focus on structure and expected patterns rather than exact content

### 2. Compelling Scenarios
Choose examples that are:
- **Immediately understandable** - Clear what problem is being solved
- **Practically useful** - Something users would actually want to do
- **Representative** - Shows the module's primary purpose

### 3. Realistic Data
- Use **real-world inputs** rather than placeholder text
- Include **edge cases** that users might encounter
- Show **different input types** when relevant

## Example Categories

### Simple Verblets
For basic transformation verblets:

```javascript
describe('Text Analysis Examples', () => {
  test('should analyze customer feedback', async () => {
    const feedback = "The product is okay but shipping was really slow and expensive.";
    
    const analysis = await analyzeSentiment(feedback);
    
    expect(analysis.sentiment).toMatch(/negative|neutral|positive/);
    expect(analysis.aspects).toContain('shipping');
    expect(analysis.confidence).toBeGreaterThan(0);
  });

  test('should handle multilingual content', async () => {
    const spanishText = "Me encanta este producto, es fantástico!";
    
    const analysis = await analyzeSentiment(spanishText);
    
    expect(analysis.sentiment).toBe('positive');
    expect(analysis.language).toBe('es');
  });
});
```

### Complex Chains
For multi-step processing chains:

```javascript
describe('Content Generation Examples', () => {
  test('should create a complete blog post', async () => {
    const topic = "sustainable gardening tips for beginners";
    const requirements = {
      tone: 'friendly',
      length: 'medium',
      includeImages: true
    };
    
    const result = await generateBlogPost(topic, requirements);
    
    expect(result.title).toBeDefined();
    expect(result.content.length).toBeGreaterThan(500);
    expect(result.sections).toHaveLength.greaterThan(2);
    expect(result.imagePrompts).toBeDefined();
    
    // Verify structure
    expect(result.content).toMatch(/introduction|getting started|tips/i);
  });

  test('should adapt to different audiences', async () => {
    const topic = "machine learning basics";
    const audience = "high school students";
    
    const result = await generateBlogPost(topic, { audience });
    
    expect(result.content).not.toMatch(/tensor|gradient descent|backpropagation/);
    expect(result.content).toMatch(/simple|easy|beginner/i);
  });
});
```

### Batch Processing
For modules that handle lists or batches:

```javascript
describe('Batch Processing Examples', () => {
  test('should process customer support tickets', async () => {
    const tickets = [
      "My order hasn't arrived yet, it's been 2 weeks",
      "The product broke after one day of use",
      "How do I return an item?",
      "Great service, very happy with my purchase!"
    ];
    
    const results = await categorizeTickets(tickets);
    
    expect(results).toHaveLength(4);
    expect(results[0].category).toBe('shipping');
    expect(results[1].category).toBe('product_issue');
    expect(results[2].category).toBe('return_request');
    expect(results[3].category).toBe('positive_feedback');
  });
});
```

## What to Include

### Essential Elements
- **Clear test descriptions** - Explain what scenario is being demonstrated
- **Realistic inputs** - Use data that reflects actual use cases
- **Meaningful assertions** - Verify important aspects of the output
- **Context comments** - Explain why this example matters

### Optional Elements
- **Console logging** - Show actual outputs for manual inspection
- **Multiple scenarios** - Different use cases or edge cases
- **Performance notes** - If timing or efficiency matters
- **Error handling examples** - How the module behaves with bad input

## What to Avoid

### Don't Include
- **Exhaustive testing** - This is not a comprehensive test suite
- **Mock data everywhere** - Prefer real examples over artificial ones
- **Overly complex scenarios** - Keep examples understandable
- **Implementation details** - Focus on usage, not internal workings

### Anti-Patterns
```javascript
// ❌ Too artificial
test('should work with test data', async () => {
  const result = await module('test input');
  expect(result).toBe('expected output');
});

// ❌ Too complex
test('should handle enterprise-level data processing with custom configurations...', async () => {
  // 50 lines of setup code
});

// ❌ Mocking LLM calls
test('should generate content', async () => {
  vi.mock('openai');
  // ... mocked responses
});
```

## Performance Considerations

- **Keep examples focused** - Don't test every possible combination
- **Use reasonable timeouts** - LLM calls can be slow
- **Consider test isolation** - Examples should work independently
- **Document expected runtime** - Note if examples are particularly slow

## Integration with Architecture Tests

Example files are validated by architecture tests to ensure they:
- Contain compelling, relatable scenarios
- Are structured as proper Vitest test suites
- Don't mock LLM calls
- Demonstrate real-world usage patterns
- Provide meaningful assertions

This ensures examples remain valuable as both documentation and validation tools. 