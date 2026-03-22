# enum

Convert free-form input to exactly one of several predefined options using AI-powered matching.

## Usage

```javascript
const priority = await enum('This needs to be done ASAP!!!', ['low', 'medium', 'high', 'critical']);
// 'critical'

// Returns undefined when no option fits
const category = await enum('quantum physics research', ['sports', 'cooking', 'fashion']);
// undefined
```

## API

### `enum(text, options, config)`

**Parameters:**
- `text` (string): The input text to classify
- `options` (Array<string>): Array of possible values to choose from
- `config` (Object): Configuration options
  - `llm` (Object): LLM configuration

**Returns:** Promise<string|undefined> - One of the provided options, or undefined if none fit

## Features

- **Flexible matching**: Understands context and meaning, not just keywords
- **Undefined handling**: Returns undefined when input doesn't match any option
- **Type safety**: Guarantees output is from your predefined options
- **Natural language understanding**: Handles synonyms, implications, and context