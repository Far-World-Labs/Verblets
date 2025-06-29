# Verblet Module Guidelines

## What is a Verblet?

Verblets are LLM-aware utility functions that transform natural language and structured data into reliable outputs. They constrain LLM outputs to prevent hallucination while handling the complexity of human expression.

## Module Structure

### Typical Verblet Pattern
```
src/verblets/module-name/
├── index.js          # Main function implementation
├── index.spec.js     # Unit tests
└── README.md         # Documentation (optional for simple verblets)
```

### Core Characteristics
- **Single Purpose**: Each verblet should do one thing well
- **Reliable Output**: Consistent, structured results from natural language input
- **Error Handling**: Graceful handling of ambiguous or invalid inputs
- **Async by Default**: Most verblets involve LLM calls

## Expected Exports

### Primary Export
```javascript
// Default export should be the main function
export default async function verbletName(input, options = {}) {
  // Implementation
}
```

### Common Patterns
- **Primitive Verblets**: Extract basic data types (bool, number, enum)
- **List Verblets**: Transform collections (filter, map, reduce)
- **Content Verblets**: Generate or transform text
- **Utility Verblets**: Specialized operations (intent, expect, auto)

## Documentation Expectations

### When README is Expected
- Complex verblets with multiple options
- Verblets with non-obvious behavior
- Verblets that are frequently used by external consumers

### When README is Optional
- Simple, self-explanatory verblets
- Internal utility verblets
- Verblets with clear names and obvious behavior

### README Content (when present)
- Brief description of purpose
- Basic usage example
- Parameter documentation
- Return value description

## Testing Expectations

### Core Test Cases
- **Happy Path**: Test with typical, expected inputs
- **Edge Cases**: Empty inputs, boundary conditions
- **Error Handling**: Invalid inputs, LLM failures
- **Mock LLM Calls**: Ensure deterministic, fast tests

### Test Organization
```javascript
describe('verbletName', () => {
  describe('with valid input', () => {
    test('should handle typical case', async () => {
      // Test implementation
    });
  });
  
  describe('with edge cases', () => {
    test('should handle empty input', async () => {
      // Test implementation
    });
  });
  
  describe('error handling', () => {
    test('should throw for invalid input', async () => {
      // Test implementation
    });
  });
});
```

## Quality Standards

### Code Organization
- Keep functions focused and single-purpose
- Use consistent parameter patterns across similar verblets
- Handle LLM interactions robustly

### Error Handling
- Validate inputs appropriately
- Provide meaningful error messages
- Handle LLM failures gracefully

### Performance
- Mock LLM calls in tests for speed
- Consider caching for expensive operations
- Use bulk operations for large datasets when available

## Examples of Good Verblets

### Simple Verblet (no README needed)
```javascript
// src/verblets/bool/index.js
export default async function bool(text, options = {}) {
  // Clear purpose, simple implementation
}
```

### Complex Verblet (README recommended)
```javascript
// src/verblets/intent/index.js
export default async function intent(text, operations, options = {}) {
  // Multiple parameters, complex behavior
}
```

## What We Don't Require

### Perfect Abstraction
- Not every verblet needs to be perfectly generic
- Specific solutions for specific problems are often better
- Focus on the actual use cases

### Comprehensive Documentation
- Simple verblets can be self-documenting
- Focus documentation on non-obvious behavior
- Examples are more valuable than exhaustive parameter lists

### Exhaustive Testing
- Test the important behaviors
- Don't test every possible edge case
- Focus on real-world usage patterns 