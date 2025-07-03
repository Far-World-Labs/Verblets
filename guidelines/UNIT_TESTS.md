# Unit Testing Guidelines

## Core Philosophy
- **Mock all LLM calls** - Tests should be deterministic and fast
- **Test behavior, not implementation** - Focus on what the function should do
- **Use realistic mock responses** - Match actual LLM output formats
- **Avoid mocking fs in most cases** - Use real file system operations for simpler, more reliable tests

## Test Organization
- Group tests by input characteristics (clear vs ambiguous)
- Use descriptive test names that specify expected behavior
- One assertion per test for clarity

## Essential Coverage

### For All Verblets
- **Clear inputs** - Unambiguous text that should produce expected results
- **Ambiguous inputs** - Unclear text requiring fallback behavior
- **Edge cases** - Empty strings, very long text, special characters
- **Input validation** - Non-string inputs, null/undefined values
- **LLM option passing** - Verify temperature, model, etc. are forwarded correctly

### For All Chains  
- **Single item processing** - Verify core transformation logic
- **Batch processing** - Confirm batching reduces API calls appropriately
- **Error recovery** - Test retry logic with temporary failures
- **Configuration options** - Batch size, retry limits, custom functions

## Specific Testing Considerations

### Mock Response Realism
- **Sentiment verblets**: Use "positive", "negative", "neutral"
- **Number extraction**: Use actual numeric strings like "42", "3.14"
- **Boolean extraction**: Use "true"/"false" strings
- **Object extraction**: Use valid JSON strings

### Input Validation Patterns
- Test type checking (string vs non-string inputs)
- Test empty string handling (return null or appropriate default)
- Test extremely long inputs if relevant to the verblet

### LLM Integration Testing
- Verify prompt structure contains expected keywords
- Confirm model options are passed through correctly
- Test error handling when LLM calls fail

### Chain-Specific Considerations
- **Batch verification**: Count API calls to ensure batching works
- **Retry testing**: Mock temporary failures followed by success
- **Memory efficiency**: For large datasets, verify streaming/chunking

## What NOT to Test
- Internal prompt text (too brittle)
- Exact LLM responses (use mocks instead)
- Performance benchmarks (separate performance tests)
- Integration with actual LLM services (separate integration tests)

## Anti-Patterns to Avoid
- **Generic test names**: "basic test", "with options"
- **Single happy path**: Only testing obvious success cases  
- **Unrealistic mocks**: Using "ok" or "success" as mock responses
- **Testing implementation details**: Checking internal variable states
- **Exhaustive input testing**: Don't test every possible string variation

## Mocking Strategy

### What TO Mock
- **LLM calls** - Always mock `chatGPT` and related AI service calls
- **External APIs** - Mock network requests to third-party services
- **Time-dependent functions** - Mock `Date.now()`, timers when testing time logic

### What NOT to Mock
- **File system operations** - Use real files and directories in tests
- **JSON schema loading** - Let tests use actual schema files
- **Internal utilities** - Don't mock your own helper functions
- **Node.js built-ins** - Avoid mocking `fs`, `path`, `process` unless absolutely necessary

### Why Avoid fs Mocking
- **Complexity** - fs mocks are complex and error-prone
- **Brittle tests** - Mock expectations often break with refactoring
- **Real behavior** - Testing with real files catches actual bugs
- **Simpler setup** - No need to mock file contents and directory structures

```javascript
// GOOD: Use real files
import { readFile } from 'fs/promises';
const schema = JSON.parse(await readFile('./schema.json', 'utf-8'));

// AVOID: Complex fs mocking
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('{"type": "object"}')
}));
```
