# to-number

A utility for converting LLM response strings to numeric values with intelligent parsing and validation.

## Basic Usage

```javascript
import toNumber from './index.js';

// Convert strings to numbers
const result1 = toNumber('42');        // => 42
const result2 = toNumber('3.14');      // => 3.14
const result3 = toNumber('invalid');   // => null
```

## Parameters

- **input** (any): The value to convert to a number
  - Strings: Parsed as numbers if valid
  - Numbers: Returned as-is
  - Null/undefined: Returns null
  - Other types: Attempts conversion, returns null if invalid

## Return Value

Returns a number if conversion is successful, or `null` if the input cannot be converted to a valid number.

## Examples

```javascript
// String conversions
toNumber('123');      // => 123
toNumber('45.67');    // => 45.67
toNumber('-89');      // => -89
toNumber('0');        // => 0

// Number inputs (pass-through)
toNumber(42);         // => 42
toNumber(3.14159);    // => 3.14159

// Invalid inputs
toNumber('abc');      // => null
toNumber('');         // => null
toNumber('12abc');    // => null
toNumber(null);       // => null
toNumber(undefined);  // => null

// Edge cases
toNumber('0.0');      // => 0
toNumber('  42  ');   // => 42 (whitespace trimmed)
toNumber('Infinity'); // => Infinity
toNumber('-Infinity'); // => -Infinity
```

## Use Cases

- Configuration value normalization
- User input validation and conversion
- Data processing and transformation
- API parameter parsing
- Form data handling

## Features

- **Flexible Parsing**: Handles various string representations of numbers
- **Validation**: Ensures output is a valid number or null
- **Type Safety**: Consistent numeric output for valid inputs
- **Whitespace Handling**: Automatically trims whitespace from strings
- **Edge Case Support**: Properly handles Infinity, -Infinity, and NaN
