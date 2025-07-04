# to-bool

Convert string values to boolean with intelligent parsing for LLM responses.

## Usage

```javascript
import toBool from './to-bool/index.js';

const result1 = toBool('true');    // => true
const result2 = toBool('false');   // => false
const result3 = toBool('TRUE');    // => true
const result4 = toBool('FALSE');   // => false
const result5 = toBool('maybe');   // => undefined
```

## Parameters

- **`value`** (any, required): The value to convert to boolean

## Return Value

Returns a boolean value based on string matching:
- **'true'** (case-insensitive): Returns `true`
- **'false'** (case-insensitive): Returns `false`
- **All other values**: Returns `undefined`

## Use Cases

### LLM Response Processing
```javascript
import toBool from './to-bool/index.js';

// Process LLM responses that return boolean strings
const llmResponse = await chatGPT("Is this statement correct?");
const isCorrect = toBool(llmResponse); // Handles "true", "false", "TRUE", "FALSE"

// Handle configuration from LLM responses
const config = {
  enabled: toBool(await chatGPT("Should this feature be enabled?")),
  visible: toBool(await chatGPT("Should this be visible?")),
  required: toBool(await chatGPT("Is this field required?"))
};
```

## Conversion Rules

| Input | Result |
|-------|--------|
| `'true'` (any case) | `true` |
| `'false'` (any case) | `false` |
| Any other value | `undefined` |

## Related Modules

- [`to-number`](../to-number/) - Numeric conversion from LLM responses
- [`to-enum`](../to-enum/) - Enum validation from LLM responses
- [`to-date`](../to-date/) - Date parsing from LLM responses 