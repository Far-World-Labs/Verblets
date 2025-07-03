# JSON Schema Guidelines

## Core Principle

**NEVER use the `toObject` chain for parsing LLM responses. Always use JSON schemas.**

## Why JSON Schemas Over toObject

1. **Type Safety**: Schemas provide compile-time and runtime validation
2. **Consistency**: Guaranteed structure across all LLM responses
3. **Performance**: No additional parsing chain overhead
4. **Debugging**: Clear validation errors when responses don't match expected structure
5. **Documentation**: Schema serves as API documentation

## Implementation Requirements

### For All Structured LLM Calls

```javascript
import chatGPT from '../../lib/chatgpt/index.js';

// Define schema (preferably in src/json-schemas/)
const schema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['items']
};

// Use schema in LLM call
const result = await chatGPT(prompt, {
  modelOptions: {
    modelName: 'fastGoodCheap',
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'result', schema }
    }
  }
});

// Result is pre-parsed and validated
const items = result.items; // Type-safe access
```

### Schema Organization

- Store reusable schemas in `src/json-schemas/`
- Use descriptive names: `question-list.js`, `commonalities-response.js`
- Export as ES6 modules with clear documentation

```javascript
// src/json-schemas/question-list.js
export default {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of generated questions'
    }
  },
  required: ['questions']
};
```

### Testing Requirements

Mock responses must return objects matching the schema structure:

```javascript
// CORRECT: Mock returns parsed object
mockChatGPT.mockResolvedValueOnce({
  items: ['item1', 'item2', 'item3']
});

// INCORRECT: Mock returns string (old toObject pattern)
// mockChatGPT.mockResolvedValueOnce('["item1", "item2"]');
```

## Migration from toObject

### Identify Usage
```bash
# Find all toObject imports
grep -r "toObject" src/

# Find all toObject calls
grep -r "toObject(" src/
```

### Replace Pattern
```javascript
// OLD: Using toObject chain
import toObject from '../to-object/index.js';
const result = await chatGPT(prompt, options);
const parsed = await toObject(result);

// NEW: Using JSON schema
const schema = { /* define schema */ };
const result = await chatGPT(prompt, {
  ...options,
  modelOptions: {
    ...options.modelOptions,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'result', schema }
    }
  }
});
// result is already parsed and validated
```

## Common Schema Patterns

### Array of Strings
```javascript
{
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['items']
}
```

### Scored Results
```javascript
{
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          score: { type: 'number' }
        },
        required: ['item', 'score']
      }
    }
  },
  required: ['results']
}
```

### Error Handling
```javascript
{
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' }
  },
  required: ['success'],
  oneOf: [
    { properties: { success: { const: true } }, required: ['data'] },
    { properties: { success: { const: false } }, required: ['error'] }
  ]
}
```

## Enforcement

- Architecture tests will validate no `toObject` usage in new code
- All PR reviews must check for proper schema usage
- Unit tests must mock schema-compliant responses
- Example tests should demonstrate schema patterns 