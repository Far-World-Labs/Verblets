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
import llm from '../../lib/llm/index.js';

// Define schema (preferably in src/json-schemas/)
const schema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

// Use schema in LLM call — flat config pattern
const result = await llm(prompt, {
  llm: 'fastGoodCheap',
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'result', schema },
  },
});

// Result is pre-parsed and validated
const items = result.items; // Type-safe access
```

### Schema Organization

- Extract inline schemas to sibling files: `schema.js` (single) or `schemas.js` (multiple)
- Export complete JSON schemas with `name` and `schema` properties
- Store truly reusable schemas in `src/json-schemas/`

```javascript
// src/chains/questions/schemas.js
export const questionListJsonSchema = {
  name: 'question_list',
  schema: {
    /* ... */
  },
};
```

### Testing Requirements

Mock responses must return objects matching the schema structure:

```javascript
// CORRECT: Mock returns parsed object
mockLlm.mockResolvedValueOnce({
  items: ['item1', 'item2', 'item3'],
});

// INCORRECT: Mock returns string (old toObject pattern)
// mockLlm.mockResolvedValueOnce('["item1", "item2"]');
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
const result = await llm(prompt, options);
const parsed = await toObject(result);

// NEW: Using JSON schema — flat config pattern
const schema = {
  /* define schema */
};
const result = await llm(prompt, {
  ...options,
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'result', schema },
  },
});
// result is already parsed and validated
```

## OpenAI API Behavior & Response Handling

### Key API Behaviors

- OpenAI returns JSON **strings** when using `response_format`, not parsed objects
- Root schema must be object type, cannot be array
- The `.items` wrapper is an API requirement for collections

### LLM Module Auto-Handling

- The llm module automatically parses JSON when `response_format` is provided
- Simple collection schemas (single `items` property containing array) are auto-unwrapped
- Use `skipResponseParse: true` in options for edge cases needing raw strings
- Import `isSimpleCollectionSchema` from llm module to detect collection patterns

### Collection Operations Guidelines

- **Core principle**: Keep `.items` wrapper internal, chains work with arrays
- Map/Filter/Find return arrays directly to consumers
- Reduce is special - it's not a collection operation, it builds accumulators
- Use default `{accumulator: string}` format for simple reduce operations

## Response Format Design Guidelines

### Best Practices

- Include descriptions in schemas to guide LLM behavior
- Avoid unnecessary nesting (no array of arrays)
- Design formats based on what chains actually need
- Keep structured output close to desired data shape
- Use `responseFormat` naming consistently (not `structuredOutput`)

### API Consistency

- Always name the parameter `responseFormat` in chain/verblet APIs
- Break and repair when making API changes - no legacy support
- Chains should work with clean data structures, not wrapped formats

## Common Schema Patterns

### Array of Strings (Simple Collection)

```javascript
{
  type: 'object',
  properties: {
    items: {
      type: 'array',
      description: 'List of results',
      items: { type: 'string' }
    }
  },
  required: ['items'],
  additionalProperties: false,
}
// Note: This will be auto-unwrapped by llm module
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
        required: ['item', 'score'],
        additionalProperties: false,
      }
    }
  },
  required: ['results'],
  additionalProperties: false,
}
```

Architecture tests validate that new code uses `response_format` instead of `toObject`. Unit test mocks must return parsed objects matching the schema structure.
