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
