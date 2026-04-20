# Code Quality Guidelines

## Comments

Add comments only for complex algorithms, non-obvious edge cases, or when explicitly requested. Code should be self-explanatory through naming and structure.

## Module Expectations

Each tier has different documentation and error handling requirements:

| Tier | Error Handling | README |
|---|---|---|
| **Prompts** (`src/prompts/`) | Only for file ops or complex transforms | Not needed |
| **Library** (`src/lib/`) | Required for file ops, network, parsing | Required for complex modules |
| **Verblets** (`src/verblets/`) | Required for LLM calls and validation | Optional for simple ones |
| **Chains** (`src/chains/`) | Comprehensive — retries, batch failures | Required |

## Collection Operations

Collection chains (`map`, `filter`, `find`, `sort`, etc.) return arrays directly. The `{ items: [...] }` wrapper is internal to the LLM response format — `callLlm` auto-unwraps it.

```javascript
// Chain returns a plain array
export default async function map(list, instructions, config = {}) {
  const { text, context } = resolveTexts(instructions, []);
  // ... prompt assembly, batching, LLM calls ...
  return results; // Array, not { items: results }
}
```

`reduce` is the exception — it works with an accumulator whose shape depends on the consumer's `responseFormat`.

## Schema Organization

Extract inline JSON schemas to sibling files: `schema.js` for a single schema, `schemas.js` for multiple. Use `responseFormat` as the config parameter name.

## Error Handling

**Required for:** file operations, network requests, LLM calls, data validation, complex transformations.

**Optional for:** string templating, basic data structure manipulation, prompt generation from known inputs.

Wrap errors with context about what failed:

```javascript
try {
  const data = await fs.readFile(path, 'utf8');
  return JSON.parse(data);
} catch (error) {
  throw new Error(`Failed to load config from ${path}: ${error.message}`);
}
```

For LLM calls, chains use `retry` which handles transient failures (429, 5xx). Verblets let errors propagate — orchestrators decide whether to retry.
