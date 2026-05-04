# Unit Testing Guidelines

## Core Philosophy
- **Mock all LLM calls** - Tests should be deterministic and fast
- **Test behavior, not implementation** - Focus on what the function should do
- **Use realistic mock responses** - Match actual LLM output formats
- **Avoid mocking fs in most cases** - Use real file system operations for simpler, more reliable tests

## Preferred shape: table-driven via `runTable`

New specs should use the table-driven runner in `src/lib/examples-runner/` and the fishery factory families in `src/lib/test-utils/factories/`. The `inventory.json` in `.claude/spec/test-inventory/` lists every existing spec and its proposed table group; migrations land module by module.

```js
import { runTable, equals, contains, throws, all } from '../../lib/examples-runner/index.js';
import { popReferenceVariants } from '../../lib/test-utils/factories/pop-reference.js';

const examples = [
  { name: 'returns the references the LLM produced', inputs: {...}, check: equals(1) },
  { name: 'prompt mentions sources', inputs: {...}, check: contains('<sources>') },
  { name: 'throws on malformed shape', inputs: {...}, check: throws('array') },
  // Inline checks read the full ctx — { result, error, inputs, varied }.
  {
    name: 'compound assertion via inline check',
    inputs: {...},
    check: ({ result, inputs }) => {
      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ source: inputs.expectedSource });
    },
  },
];

runTable({ describe: 'popReferenceItem', examples, process });
```

### `check` — composable assertions

A `check` is `(ctx) => void | Promise<void>` where `ctx = { result, error, inputs, varied }`. The runner calls it once per row and the check uses vitest's `expect` for assertions.

Base check builders exported from `examples-runner`:

| Builder | Asserts on | Vitest equivalent |
|---|---|---|
| `equals(v)` | `result` deep-equals `v` | `toEqual(v)` |
| `eq(v)` | `result === v` | `toBe(v)` |
| `contains(x)` | `result` contains `x` | `toContain(x)` |
| `matches(s\|re)` | `result` matches | `toMatch(...)` |
| `partial(obj)` | `result` matches subset | `toMatchObject(obj)` |
| `length(n)` | `result.length === n` | `toHaveLength(n)` |
| `truthy()` / `falsy()` | result truthy/falsy | `toBeTruthy()` / `toBeFalsy()` |
| `isNull()` / `isUndefined()` | `result` is null/undefined | `toBeNull()` / `toBeUndefined()` |
| `throws(matcher?)` | processor threw (optionally matching) | `expect(thrower).toThrow(...)` |
| `all(...checks)` | every check passes against the same ctx | n/a |
| `when(predicate, check)` | run `check` only if `predicate(ctx)` truthy | n/a |

When nothing in the base set fits, write the check inline — `check: (ctx) => { ... }` — and reach for `expect` directly.

### `want` — legacy/simple shorthand

`want` still works for the most common cases and is translated internally into the matching check. New code can use `want` for quick rows and graduate to `check` when something doesn't fit.

| `want` shape | Translates to |
|---|---|
| literal value | `equals(value)` |
| function `(varied) => v` | called per row, then `equals` |
| `{ throws: true \| string \| RegExp }` | `throws(matcher)` |
| `{ eq: v }` | `eq(v)` |
| `{ contains: x }` | `contains(x)` |
| `{ matches: x }` | `matches(x)` |
| `{ partial: obj }` | `partial(obj)` |

### `vary` — cross-product expansion

Optional. Declares axes; `expandExamples` turns one row into N (one per combination). `inputs` and `want` may be functions that receive the varied combo.

### `withRunner` — shared config

When several tables share `process` / `beforeEach`, partial-apply once:

```js
const runScale = withRunner({ process: scaleProcessor, beforeEach: clearMocks });
runScale({ describe: 'numbers', examples: numericExamples });
runScale({ describe: 'strings', examples: stringExamples });
```

### Distill assertions into the processor's return

Most "imperative-only" tests collapse: a processor that returns `{ length, outcome, schemaName }` plus `check: partial({...})` covers compound assertions cleanly. Reserve inline `(ctx) => {...}` checks for cases that genuinely don't reduce to a single shape compare.

Reference migrations: `src/lib/pave/index.spec.js` (pure utility) and `src/chains/pop-reference/index.spec.js` (LLM-backed chain).

## Mock factories

Use the fishery-based factory families (`src/lib/test-utils/factories/`) for LLM mock responses, scan-shaped fixtures, and progress-event fixtures. Each chain factory exposes the same variant vocabulary:

- `wellFormed`, `empty`, `isNull`, `undefinedValue`, `malformedShape`, `rejected`
- `undersized`, `oversized` (when the response shape contains an array)

Don't force a common payload base — chains have different well-formed shapes (`{ references: [...] }`, `{ value: number }`, etc.). Variant *names* align across chains; payload structures stay native to the chain.

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
- **LLM calls** - Always mock `llm` and related AI service calls
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
