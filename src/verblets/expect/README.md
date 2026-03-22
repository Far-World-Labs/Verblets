# expect

Make semantic assertions using natural language. A single LLM call checks whether content matches an expectation based on meaning, not string equality.

```javascript
import { expect } from '@far-world-labs/verblets';

// Semantic equality (throws on failure)
await expect('hello').toEqual('hello');

// Constraint-based validation
await expect('Hello world!').toSatisfy('Is this a greeting?');

// Failed assertion throws with descriptive message
await expect('goodbye').toEqual('hello');
// throws: "LLM assertion failed: Does the actual value strictly equal the expected value?"
```

The underlying `llmAssert` function (not a public export) accepts `{ throws: false }` to return a boolean instead of throwing.

For test suites, the [aiExpect chain](../../chains/expect/) adds debugging advice and environment-controlled verbosity:

```bash
VERBLETS_LLM_EXPECT_MODE=none   # Silent (default)
VERBLETS_LLM_EXPECT_MODE=info   # Log debugging advice on failures
VERBLETS_LLM_EXPECT_MODE=error  # Throw with detailed debugging advice
```

Write assertions that test meaning rather than exact phrasing. Be specific enough that the LLM can give a clear yes/no answer, and remember each assertion costs one LLM call.
