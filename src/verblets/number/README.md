# number

Convert a block of text to a single number using AI-powered extraction and interpretation.

## Usage

```javascript
const quantity = await number('I need about three dozen eggs');
// 36
```

## API

### `number(text, config)`

**Parameters:**
- `text` (string): Text containing numeric information
- `config` (Object): Configuration options
  - `llm` (Object): LLM configuration

**Returns:** Promise<number|undefined> - Extracted number or undefined if none found

## Features

- **Natural language parsing**: Understands words, fractions, and expressions
- **Context awareness**: Interprets "dozen" as 12, "quarter" as 0.25, etc.
- **Undefined handling**: Returns undefined when no number is present
- **Decimal support**: Handles both integers and floating-point numbers