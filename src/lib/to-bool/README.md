# to-bool

Converts string values to boolean with intelligent parsing for LLM responses.

## Usage

```javascript
import toBool from './index.js';

// Basic boolean conversion
const result1 = toBool('true');      // true
const result2 = toBool('false');     // false
const result3 = toBool('yes');       // true
const result4 = toBool('no');        // false
const result5 = toBool('1');         // true
const result6 = toBool('0');         // false
```

## Parameters

- **`value`** (any): The value to convert to boolean
  - Strings are parsed with case-insensitive matching
  - Numbers: 0 = false, non-zero = true
  - Booleans are returned unchanged
  - null/undefined return false

## Return Value

Returns a boolean value based on intelligent parsing of the input.

## Examples

```javascript
// String variations (case-insensitive)
toBool('TRUE');          // true
toBool('True');          // true
toBool('YES');           // true
toBool('Yes');           // true
toBool('ON');            // true
toBool('ENABLED');       // true

toBool('FALSE');         // false
toBool('False');         // false
toBool('NO');            // false
toBool('No');            // false
toBool('OFF');           // false
toBool('DISABLED');      // false

// Numeric conversion
toBool(1);               // true
toBool(-1);              // true
toBool(0);               // false
toBool(0.0);             // false

// Boolean passthrough
toBool(true);            // true
toBool(false);           // false

// Null/undefined handling
toBool(null);            // false
toBool(undefined);       // false
toBool('');              // false

// Whitespace handling
toBool('  true  ');      // true
toBool('  false  ');     // false
```

## Use Cases

### Processing LLM Boolean Responses
```javascript
import toBool from './index.js';

// Convert various boolean formats from LLM responses
const responses = [
  'The user is authenticated: yes',
  'Is premium member: true',
  'Has permissions: enabled'
];

const booleans = responses.map(response => {
  // Extract boolean portion (implementation depends on your needs)
  const boolStr = extractBooleanFromResponse(response);
  return toBool(boolStr);
});
```

### Configuration Processing
```javascript
function processConfig(config) {
  return {
    debugMode: toBool(config.debug),
    enableLogging: toBool(config.logging),
    isProduction: toBool(config.production)
  };
}

// Works with various input formats
const config1 = processConfig({ debug: 'true', logging: 'yes', production: '1' });
const config2 = processConfig({ debug: true, logging: 'enabled', production: 0 });
```

### Form Validation
```javascript
function validateUserPreferences(formData) {
  return {
    emailNotifications: toBool(formData.emailNotifications),
    darkMode: toBool(formData.darkMode),
    autoSave: toBool(formData.autoSave)
  };
}
```

## Features

- **Case-Insensitive**: Handles 'TRUE', 'True', 'true', etc.
- **Multiple Formats**: Supports yes/no, on/off, enabled/disabled, 1/0
- **Whitespace Tolerant**: Automatically trims whitespace
- **Type Flexible**: Handles strings, numbers, booleans, null/undefined
- **LLM Optimized**: Designed for processing AI model responses

## Related Modules

- [`to-number`](../to-number/README.md) - Convert values to numbers
- [`to-date`](../to-date/README.md) - Convert values to dates
- [`to-enum`](../to-enum/README.md) - Convert values to enumerated types 
