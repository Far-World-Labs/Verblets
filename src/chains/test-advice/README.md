# test-advice

Comprehensive code analysis that runs multiple test scenarios to identify issues, suggest improvements, and validate behavior. Combines boundary testing, best practices, and refactoring suggestions.

## Usage

```javascript
const allIssues = await testAdvice('./src/utils/calculateDiscount.js');
// Returns combined array of issues from all test categories
```

## API

### `testAdvice(path)`

**Parameters:**
- `path` (string): File path to analyze

**Returns:** Promise<Array<string>> - Combined array of all issues and suggestions found

## Test Categories

The function runs eight different test scenarios:

1. **Boundary Testing**: Tests edge cases and boundary values
2. **Success Scenarios**: Validates correct behavior with valid inputs
3. **Failure Scenarios**: Identifies failing cases and error conditions
4. **Defect Detection**: Finds bugs and logic errors
5. **Best Practices**: Suggests industry-standard improvements
6. **Clean Code**: Recommends readability and maintainability improvements
7. **Code Quality**: Identifies general quality issues
8. **Refactoring**: Suggests structural improvements for composability

## Features

- **Comprehensive analysis**: Covers multiple aspects of code quality in one call
- **Actionable feedback**: Each issue includes specific examples or line references
- **Practical focus**: Emphasizes real defects and improvements over style nitpicks
- **DBC awareness**: Assumes Design by Contract, respects JSDoc type specifications