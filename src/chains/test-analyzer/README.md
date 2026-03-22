# test-analyzer

Analyze test failures using AI to produce diagnostic summaries with actionable fix suggestions. Used internally by the architecture test system.

```javascript
import { analyzeTestError } from './index.js';

const analysis = await analyzeTestError(testLogs);
// => "Solution: Fix the off-by-one error in calculateTotal()...\n\nDiscussion: ..."
```

## API

### `analyzeTestError(logs, config)`

- **logs** (Array): Complete test execution logs from test-start to test-complete
- **config.analysisDepth** (`'low'`|`'high'`): Controls context window and token budgets. `'low'` uses smaller windows (10 context lines, 150 max tokens). `'high'` uses larger windows (50 context lines, 600 max tokens). Default: 25 context lines, 300 max tokens
- **config.contextSize** (number): Override lines of context around the failed assertion
- **config.maxWindow** (number): Override maximum code window size in lines
- **config.maxTokens** (number): Override LLM response token budget
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<string>` — Diagnostic summary with solution and discussion, or empty string if analysis fails
