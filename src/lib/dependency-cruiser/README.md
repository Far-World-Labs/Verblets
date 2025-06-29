# Dependency Cruiser Library

A wrapper around the [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) tool for analyzing JavaScript module dependencies and enforcing architectural rules.

## Purpose

This library provides utilities for:
- Detecting circular dependencies
- Enforcing import restrictions between different parts of the codebase
- Analyzing dependency structure and file organization
- Running dependency cruiser rules programmatically

## Key Functions

### `runDCRule(rule)`

Executes a dependency cruiser rule and throws an error if violations are found.

```javascript
import { runDCRule } from './src/lib/dependency-cruiser/index.js';

// Check for circular dependencies
await runDCRule({
  name: 'no-circular',
  severity: 'error',
  from: {},
  to: {
    circular: true
  }
});

// Prevent verblets from importing chains
await runDCRule({
  name: 'verblets-no-chains',
  severity: 'error',
  from: {
    path: '^src/verblets/'
  },
  to: {
    path: '^src/chains/'
  }
});
```

### `getDependencyAnalysis()`

Returns the full dependency analysis for the codebase.

### `asDCContext(items)`

Converts a list of file paths into a dependency cruiser context for analysis.

### `checkFileStructure(items, description)`

Checks if the file structure matches the given description using dependency analysis.

## Architecture Rules

This library is commonly used to enforce architectural constraints like:

- **No circular dependencies** - Prevents modules from creating circular import chains
- **Layer separation** - Ensures lower-level modules don't import from higher levels
- **Domain boundaries** - Prevents cross-domain imports where not allowed

## Performance

The dependency cruiser approach is significantly faster than LLM-based analysis for structural checks, making it ideal for CI/CD pipelines and frequent validation. 