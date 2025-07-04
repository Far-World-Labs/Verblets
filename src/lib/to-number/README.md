# to-number

A utility for converting LLM response strings to numeric values with intelligent parsing and validation.

## Basic Usage

```javascript
import toNumber from './index.js';
<<<<<<< HEAD
=======

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
>>>>>>> origin/main

// Convert strings to numbers
const result1 = toNumber('42');        // => 42
const result2 = toNumber('3.14');      // => 3.14
const result3 = toNumber('undefined'); // => undefined

<<<<<<< HEAD
// Invalid inputs throw errors
try {
  const result4 = toNumber('invalid');
} catch (error) {
  console.log(error.message); // => 'ChatGPT output [error]'
}
```

## Parameters

- **input** (any): The value to convert to a number
  - Strings: Parsed as numbers if valid, 'undefined' returns undefined
  - Numbers: Processed through stripNumeric and validation
  - Other types: Converted to string and processed

## Return Value

Returns a number if conversion is successful, `undefined` if input is 'undefined', or **throws an error** if the input cannot be converted to a valid number.

## Examples

```javascript
// String conversions
toNumber('123');      // => 123
toNumber('45.67');    // => 45.67
toNumber('-89');      // => -89
toNumber('0');        // => 0
toNumber('undefined'); // => undefined

// Invalid inputs (throw errors)
toNumber('abc');      // => throws Error('ChatGPT output [error]')
toNumber('12abc');    // => throws Error('ChatGPT output [error]')
toNumber('');         // => throws Error('ChatGPT output [error]')

// Edge cases
toNumber('0.0');      // => 0
toNumber('Infinity'); // => Infinity
toNumber('-Infinity'); // => -Infinity
```

## Use Cases

### LLM Response Processing
```javascript
import toNumber from './index.js';

// Process numeric responses from LLMs
const llmResponse = await chatGPT("How many items are there?");
try {
  const count = toNumber(llmResponse);
  console.log(`Found ${count} items`);
} catch (error) {
  console.log('LLM did not return a valid number');
}

// Handle undefined responses
const maybeNumber = toNumber(await chatGPT("What's the score?"));
if (maybeNumber === undefined) {
  console.log('No score available');
}
```

## Related Modules

- [`to-bool`](../to-bool/) - Boolean conversion from LLM responses
- [`to-enum`](../to-enum/) - Enum validation from LLM responses
- [`to-date`](../to-date/) - Date parsing from LLM responses 
=======
- **Flexible Parsing**: Handles various string representations of numbers
- **Validation**: Ensures output is a valid number or null
- **Type Safety**: Consistent numeric output for valid inputs
- **Whitespace Handling**: Automatically trims whitespace from strings
- **Edge Case Support**: Properly handles Infinity, -Infinity, and NaN 
>>>>>>> origin/main
