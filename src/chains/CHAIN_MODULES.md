# Chain Module Guidelines

## What is a Chain?

Chains are AI-powered workflows and operations that handle complex, multi-step processes. They often involve batch processing, retry logic, and sophisticated LLM interactions for tasks that exceed simple verblet capabilities.

## Module Structure

### Typical Chain Pattern
```
src/chains/module-name/
├── index.js          # Main chain implementation
├── index.spec.js     # Unit tests
├── README.md         # Documentation (usually recommended)
└── schema.json       # JSON schema (if applicable)
```

### Core Characteristics
- **Complex Workflows**: Multi-step processes with sophisticated logic
- **Batch Processing**: Handle large datasets efficiently
- **Retry Logic**: Robust error handling and recovery
- **Stateful Operations**: May maintain state across operations

## Expected Exports

### Primary Export
```javascript
// Default export should be the main chain function
export default async function chainName(input, options = {}) {
  // Complex implementation with multiple steps
}
```

### Common Patterns
- **List Operations**: batch processing (map, filter, reduce, sort)
- **Content Generation**: multi-step content creation
- **Analysis Chains**: complex data analysis workflows
- **Orchestration**: coordinate multiple LLM interactions

## Documentation Expectations

### When README is Recommended
- Most chains benefit from documentation due to complexity
- Chains with multiple configuration options
- Chains that are part of public API
- Chains with non-obvious behavior or sophisticated logic

### When README is Optional
- Very simple chains that are essentially enhanced verblets
- Internal utility chains with obvious behavior
- Chains that are primarily wrappers around simpler operations

### README Content (when present)
- Purpose and use cases
- Configuration options
- Examples of typical usage
- Performance characteristics
- Batch processing behavior

## Testing Expectations

### Core Test Cases
- **Main Workflow**: Test the primary chain functionality
- **Batch Processing**: Test with multiple items
- **Error Recovery**: Test retry logic and error handling
- **Configuration**: Test different option combinations
- **Mock External Calls**: LLM interactions should be mocked

### Test Organization
```javascript
describe('chainName', () => {
  describe('single item processing', () => {
    test('should process individual items', async () => {
      // Test implementation
    });
  });
  
  describe('batch processing', () => {
    test('should handle multiple items efficiently', async () => {
      // Test implementation
    });
  });
  
  describe('error handling', () => {
    test('should retry on transient failures', async () => {
      // Test implementation
    });
  });
  
  describe('configuration options', () => {
    test('should respect custom options', async () => {
      // Test implementation
    });
  });
});
```

## Quality Standards

### Code Organization
- Break complex chains into smaller, testable functions
- Use consistent patterns for batch processing
- Handle state management carefully
- Implement proper error boundaries

### Error Handling
- Robust retry logic for LLM failures
- Graceful degradation when possible
- Clear error messages for debugging
- Proper cleanup of resources

### Performance
- Efficient batch processing
- Consider memory usage with large datasets
- Implement appropriate caching strategies
- Use bulk operations when available

## Examples of Chain Types

### Batch Processing Chain
```javascript
// src/chains/map/index.js
export default async function map(items, instruction, options = {}) {
  // Handles large arrays with chunking and retry logic
}
```

### Analysis Chain
```javascript
// src/chains/themes/index.js
export default async function themes(text, options = {}) {
  // Multi-step analysis with sophisticated processing
}
```

### Orchestration Chain
```javascript
// src/chains/conversation/index.js
export default async function conversation(messages, policy, options = {}) {
  // Coordinates multiple LLM interactions with state management
}
```

## What We Don't Require

### Perfect Modularity
- Chains can be monolithic if that's the most practical approach
- Not every step needs to be a separate function
- Focus on maintainability over theoretical purity

### Exhaustive Configuration
- Provide sensible defaults
- Only expose options that users actually need
- Avoid configuration for configuration's sake

### Universal Batch Processing
- Some chains work better with individual processing
- Choose the approach that fits the use case
- Document the processing model clearly

## Special Considerations

### Batch Processing Guidelines
- Use appropriate chunk sizes for LLM context limits
- Implement progress reporting for long-running operations
- Handle partial failures gracefully
- Consider memory usage with large datasets

### State Management
- Keep state minimal and well-defined
- Use immutable patterns where possible
- Clean up resources properly
- Document state lifecycle clearly

### LLM Interaction Patterns
- Use consistent prompt templates
- Implement proper timeout handling
- Cache expensive operations appropriately
- Handle rate limiting gracefully 