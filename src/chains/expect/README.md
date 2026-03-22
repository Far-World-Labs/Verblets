# expect

Intelligent assertions with debugging context and environment-aware behavior. Extends the basic [expect verblet](../../verblets/expect/) with code introspection and structured failure advice.

```javascript
import { expect } from './index.js';

process.env.LLM_EXPECT_MODE = 'info'; // 'none' (default) | 'info' | 'error'

const [passed, details] = await expect(
  generatedCopy,
  "Is this marketing copy professional, engaging, and free of grammatical errors?"
);

if (!passed) {
  console.log(`Failed at ${details.file}:${details.line}`);
  console.log(details.advice);
  // ISSUE: Copy contains informal language and lacks call-to-action
  // FIX: Replace casual phrases with professional alternatives and add clear CTA
  // CONTEXT: Marketing copy should maintain professional tone while being engaging
}
```

## API

### `expect(actual, expected?, constraint?, config?)`

**Returns:** `[passed, details]` — tuple with boolean and structured debug info

- `actual` (*): Value to test
- `expected` (*): Optional expected value for comparison
- `constraint` (string): Optional natural language assertion
- `config` (Object): Configuration options
  - `advice` (`'low'`|`'high'`): Controls introspection depth on failure. `'low'` disables code analysis. `'high'` (default) reads surrounding source and module under test

### Environment modes (`LLM_EXPECT_MODE`)

- **`none`** (default): Returns structured results silently
- **`info`**: Logs failures with context and advice to console
- **`error`**: Throws detailed errors on failure (for CI/CD)

## Best Practices

```javascript
// ❌ Vague
await expect(text, "Is this good?");

// ✅ Specific
await expect(text, "Is this text grammatically correct, under 100 words, and written in a professional tone?");
```

Write constraints that a human could answer yes/no. Tune rigor to the model performing the eval.
