# list

Generate lists from natural language prompts, with support for streaming and structured output.

## Example

```javascript
import { list, generateList } from '@far-world-labs/verblets';

// Generate edge cases a QA engineer might miss
const edgeCases = await list(
  'Edge cases for a date picker that handles international formats, timezones, and leap years',
  { count: 12 }
);
// => ["February 29 in a non-leap year", "Timezone crossing midnight boundary", ...]

// Stream items for real-time display
for await (const item of generateList('Security vulnerabilities in REST APIs', { count: 15 })) {
  console.log(`Found: ${item}`);
}
```

## API

### `list(prompt, config?)`

- **prompt** (string): What to generate
- **config**:
  - `count` (number, default: 10): Target item count
  - `schema` (object): JSON schema for structured objects instead of strings
  - `llm` (string|object): LLM configuration

Returns `string[]` (or `object[]` if `schema` is provided).

### `generateList(prompt, options?)`

Async generator yielding items progressively.

- **options**:
  - `shouldSkip({ result, resultsAll })` — skip duplicate/unwanted items
  - `shouldStop({ queryCount, startTime })` — custom termination logic
  - `llm` (string|object): LLM configuration
