# dependency-cruiser

Wrapper around [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) for enforcing architectural rules programmatically. Used by architecture tests to detect circular dependencies, enforce layer separation, and validate import boundaries.

```javascript
import { runDCRule } from '@far-world-labs/verblets';

// Prevent verblets from importing chains
await runDCRule({
  name: 'verblets-no-chains',
  severity: 'error',
  from: { path: '^src/verblets/' },
  to: { path: '^src/chains/' },
});
```

## API

### `runDCRule(rule)`

Execute a dependency-cruiser rule. Throws if violations are found.

### `getDependencyAnalysis()`

Return the full dependency analysis for the codebase.

### `asDCContext(items)`

Convert file paths into a dependency-cruiser context for analysis.

### `checkFileStructure(items, description)`

Validate that file structure matches a description using dependency analysis.
