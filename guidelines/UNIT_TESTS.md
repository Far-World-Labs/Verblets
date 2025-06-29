# Unit Testing Guidelines

## Philosophy

Unit tests in Verblets should focus on verifying the behavior and reliability of individual functions, especially those that interact with LLMs. Our tests should be practical, maintainable, and focused on real-world usage patterns.

## Test Structure

### Descriptive Test Names
- Use clear, behavior-focused test names that describe what the test verifies
- Good: `'should extract number from natural language text'`
- Good: `'should handle empty input gracefully'`
- Avoid: `'Basic usage'`, `'Test 1'`

### Test Organization
- Group related tests using `describe` blocks
- Use nested `describe` blocks for different scenarios or input types
- Each test should verify one specific behavior

### Coverage Expectations
- **Core functionality**: Test the main use case with typical inputs
- **Edge cases**: Test with empty inputs, null/undefined, boundary values
- **Error handling**: Verify graceful handling of invalid inputs
- **LLM interactions**: Mock external LLM calls for consistent, fast tests

## LLM-Aware Testing

### Mocking Strategy
- Mock LLM calls to ensure tests are deterministic and fast
- Use realistic mock responses that match expected output formats
- Test both successful responses and error scenarios

### Input Validation
- Test with various natural language inputs that users might provide
- Verify the function handles ambiguous or unclear inputs appropriately
- Test with different languages or formats when relevant

## What We Don't Require

### Exhaustive Coverage
- Not every edge case needs a test if it's handled by underlying libraries
- Focus on testing the logic specific to your function
- Integration tests can cover some scenarios better than unit tests

### Perfect Mocking
- Simple string returns from mocks are often sufficient
- Don't over-engineer mock implementations unless testing complex interactions

### Performance Testing
- Unit tests should focus on correctness, not performance
- Performance testing belongs in integration or benchmark tests

## Examples of Good Tests

```javascript
describe('numberVerblet', () => {
  describe('with valid numeric text', () => {
    test('should extract whole numbers', async () => {
      // Test implementation
    });
    
    test('should extract decimal numbers', async () => {
      // Test implementation
    });
  });
  
  describe('with ambiguous input', () => {
    test('should handle multiple numbers by returning the first', async () => {
      // Test implementation
    });
  });
  
  describe('error handling', () => {
    test('should throw descriptive error for non-numeric text', async () => {
      // Test implementation
    });
  });
});
```

## File Organization
- One test file per module: `module-name/index.spec.js`
- Keep test files close to the code they test
- Use consistent naming patterns across the project 