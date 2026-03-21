# test-analyzer

Analyze test failures using AI to produce diagnostic summaries with actionable fix suggestions.

## Usage

```javascript
import analyzeTestError from './index.js';

const analysis = await analyzeTestError(testLogs);
// Returns: "Solution: Fix the off-by-one error in calculateTotal()...\n\nDiscussion: ..."
```

## API

### `analyzeTestError(logs, config)`

**Parameters:**
- `logs` (Array): Complete test execution logs from test-start to test-complete
- `config` (Object): Configuration options
  - `analysisDepth` (`'low'`|`'high'`): Controls context window and token budgets for analysis. `'low'` uses smaller windows (10 context lines, 25 max window, 150 max tokens). `'high'` uses larger windows for deeper analysis (50 context lines, 100 max window, 600 max tokens). Default: 25 context lines, 50 max window, 300 max tokens
  - `contextSize` (number): Override lines of context around the failed assertion
  - `maxWindow` (number): Override maximum code window size in lines
  - `maxTokens` (number): Override LLM response token budget
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<string> - Diagnostic summary with solution and optional discussion, or empty string if analysis fails
