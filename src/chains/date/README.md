# date

Extract a single date from natural language text using AI-powered parsing with optional expectation-based validation.

## Usage

```javascript
import { date } from '@far-world-labs/verblets';

const text = "The Berlin Wall fell on November 9th, 1989";
const result = await date(text);

// Returns: Date object for 1989-11-09T00:00:00.000Z
```

## API

### `date(text, config)`

**Parameters:**
- `text` (string): Text containing a date to extract
- `config` (Object): Configuration options
  - `rigor` (`'low'`|`'high'`): Controls validation depth. `'low'` skips expectation generation and validation — extraction only (1 LLM call). `'high'` uses more validation attempts (5) and returns `undefined` on exhaustion instead of best-effort. Default: extract + validate with 3 attempts, returning best-effort date on exhaustion
  - `validate` (boolean): Override whether to run the validation loop
  - `maxAttempts` (number): Override maximum extraction attempts
  - `returnBestEffort` (boolean): Override whether to return best-effort date on exhaustion
  - `llm` (string|Object): LLM model configuration

**Returns:** Promise<Date|undefined> - Extracted date normalized to UTC midnight, or `undefined` if no date found

## How It Works

1. **Expectation generation** — LLM generates yes/no checks to validate the extracted date
2. **Date extraction** — LLM extracts and normalizes the date from text
3. **Validation loop** — Each expectation is checked against the extracted date using `bool`
4. **Retry on failure** — If validation fails, re-extracts with the failed check as context

Low rigor skips steps 1, 3, and 4 — a single extraction call.

## Configuration

```javascript
// Quick extraction, no validation
const quick = await date("meeting next Tuesday", { rigor: 'low' });

// Strict validation, fails rather than guessing
const strict = await date("Q3 2024 earnings call", { rigor: 'high' });
```
