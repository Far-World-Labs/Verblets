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

The codebase has been migrated from `toObject` to JSON schemas. The `toObject` chain still exists as a heavyweight JSON repair tool for consumer-level use, but internal chains should always use `response_format` with a schema. If you find a chain still using `toObject` for parsing, replace it with a schema.

## Structured Output Behavior

The structured output API (used by both OpenAI and Anthropic providers) requires object-type root schemas — you cannot use a bare array at the top level. For collections, wrap in `{ items: [...] }`.

The llm module handles the mechanics automatically:
- Parses JSON responses when `response_format` is set
- Auto-unwraps simple collection schemas (single `items` property containing an array)
- Auto-unwraps single-value schemas (single `value` property)

Pass `skipResponseParse: true` in the options object when you need the raw unparsed string.

### Collection conventions

Map, filter, and find chains return arrays directly to consumers — the `.items` wrapper stays internal. Reduce is different: it builds accumulators, so its default schema is `{ accumulator: string }`.

## Response Format Design Guidelines

### Best Practices

- Include `description` fields in schema properties to guide LLM behavior
- Avoid unnecessary nesting (no array of arrays)
- Design schemas based on what the chain actually needs, close to the desired data shape
- The parameter is `response_format` everywhere — in callLlm options, in config, and when building schemas with `jsonSchema()`

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
