# test-advice

Comprehensive code analysis that runs multiple test scenarios to identify issues, suggest improvements, and validate behavior. Combines boundary testing, best practices, and refactoring suggestions.

## Usage

```javascript
const allIssues = await testAdvice('./src/utils/calculateDiscount.js');
// Returns combined array of issues from all test categories
```

## API

### `testAdvice(path, config)`

**Parameters:**
- `path` (string): File path to analyze
- `config` (Object): Configuration options
  - `llm` (Object): LLM model options
  - `onProgress` (Function): Progress callback

**Returns:** `Promise<Array<string>>` - Combined array of all issues and suggestions found across all categories

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

The analysis assumes Design by Contract and respects JSDoc type specifications. Issues include specific line references and concrete fix suggestions, focusing on real defects over style nitpicks.