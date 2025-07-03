# to-bool

Convert various input types to boolean values with intelligent parsing and consistent behavior.

## Usage

```javascript
import toBool from './to-bool/index.js';

const result1 = toBool('true');    // => true
const result2 = toBool('no');      // => false
const result3 = toBool(1);         // => true
const result4 = toBool('');        // => false
```

## Parameters

- **`value`** (any, required): The value to convert to boolean

## Return Value

Returns a boolean value based on intelligent parsing of the input:
- **Strings**: Converts common boolean representations ('true', 'false', 'yes', 'no', '1', '0', etc.)
- **Numbers**: 0 becomes `false`, all other numbers become `true`
- **Booleans**: Returns the value unchanged
- **Null/Undefined**: Returns `false`
- **Empty strings**: Returns `false`

## Features

- **Flexible Input Types**: Accepts strings, numbers, booleans, and null/undefined values
- **Intelligent String Parsing**: Recognizes common boolean representations in multiple formats
- **Case Insensitive**: Handles various capitalizations ('TRUE', 'False', 'YES', etc.)
- **Predictable Rules**: Consistent conversion logic across all input types
- **Zero Dependencies**: Pure JavaScript implementation with no external dependencies

## Use Cases

### Configuration Processing
```javascript
import toBool from './to-bool/index.js';

const config = {
  debug: toBool(process.env.DEBUG),           // "true" -> true
  verbose: toBool(process.env.VERBOSE),       // "1" -> true
  production: toBool(process.env.NODE_ENV === 'production')
};
```

### User Input Validation
```javascript
const userPreferences = {
  notifications: toBool(formData.notifications),  // "yes" -> true
  darkMode: toBool(formData.darkMode),           // "on" -> true
  autoSave: toBool(formData.autoSave)            // "false" -> false
};
```

### API Response Processing
```javascript
const apiData = await fetch('/api/settings').then(r => r.json());
const settings = {
  enabled: toBool(apiData.enabled),
  public: toBool(apiData.public),
  verified: toBool(apiData.verified)
};
```

### Command Line Arguments
```javascript
const args = process.argv.slice(2);
const options = {
  watch: toBool(args.includes('--watch')),
  minify: toBool(args.includes('--minify')),
  sourceMaps: toBool(args.includes('--source-maps'))
};
```

## Conversion Rules

| Input Type | Examples | Result |
|------------|----------|---------|
| **Boolean** | `true`, `false` | Unchanged |
| **String (truthy)** | `'true'`, `'yes'`, `'1'`, `'on'`, `'enabled'` | `true` |
| **String (falsy)** | `'false'`, `'no'`, `'0'`, `'off'`, `'disabled'`, `''` | `false` |
| **Number (zero)** | `0`, `-0` | `false` |
| **Number (non-zero)** | `1`, `-1`, `42`, `3.14` | `true` |
| **Null/Undefined** | `null`, `undefined` | `false` |

## Integration Patterns

### With Configuration Systems
```javascript
import toBool from './to-bool/index.js';

class ConfigManager {
  constructor(rawConfig) {
    this.debug = toBool(rawConfig.debug);
    this.verbose = toBool(rawConfig.verbose);
    this.autoReload = toBool(rawConfig.autoReload);
  }
}
```

### With Form Processing
```javascript
import toBool from './to-bool/index.js';

function processFormData(formData) {
  return {
    subscribe: toBool(formData.get('subscribe')),
    terms: toBool(formData.get('terms')),
    marketing: toBool(formData.get('marketing'))
  };
}
```

## Related Modules

- [`to-number`](../to-number/README.md) - Convert values to numbers with intelligent parsing
- [`to-date`](../to-date/README.md) - Convert values to Date objects
- [`validate`](../validate/README.md) - Validate and convert input values

## Error Handling

The `to-bool` utility is designed to be error-free and always return a boolean value. It handles edge cases gracefully:

```javascript
// All of these return valid booleans without throwing errors
const results = [
  toBool(undefined),     // => false
  toBool(null),          // => false
  toBool({}),            // => true (truthy object)
  toBool([]),            // => true (truthy array)
  toBool('invalid'),     // => true (non-empty string)
  toBool(NaN),           // => false (falsy number)
  toBool(Infinity)       // => true (truthy number)
];
``` 